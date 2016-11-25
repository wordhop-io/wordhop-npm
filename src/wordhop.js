'use strict';

var rp = require('request-promise');
var io = require('socket.io-client');

function WordhopBot(apiKey, serverRoot, socketServer, controller, clientkey, token, debug) {
    var that = Object;
    var socket = io.connect(socketServer);
    that.apiKey = apiKey;
    that.serverRoot = serverRoot;
    that.controller = controller;
    that.debug = debug;
    that.clientkey = clientkey;
    that.token = token;
    that.events = {};

    that.emit = function(event, message) {
        socket.emit(event, message);
    }

    that.checkIfMessage = function(message) {
        if (message.text == null) {
            message.text = "";
        }

        if ((message.type === 'user_message' || message.type === 'message' || message.type == null || message.page) 
            && message.channel 
            && message.user != 'USLACKBOT' 
            && message.transcript == null 
            && (message.subtype == null || message.subtype === "file_share")
            && message.hasOwnProperty("reply_to") == false
            && message.is_echo == null
            && message.bot_id == null
            && (message.text.length > 0 || message.attachments != null || message.attachment != null)) {
            return true;
        };
        return false;
    }

    that.structureMessage = function(message) {

        
        if (that.checkIfMessage(message)) {
            message.client_key = that.clientkey;
            if (message.timestamp == null && message.ts == null) {
                message.timestamp = Date.now();
            }
            if (message.timestamp) {
                message.timestamp = message.timestamp / 1000;
            }
            return message;
        };
    }

    that.logUnkownIntent = function(message) {

        console.log("logUnkownIntent");

        var data = {
            method: 'POST',
            url: that.serverRoot + '/track',
            headers: {
                'content-type': 'application/json',
                'apikey': that.apiKey,
                'platform': that.platform,
                'clientkey': that.clientkey,
                'failure': true,
                'type':'unknown'
            },

            json: {
                message: message
            }
        };
        rp(data);
    }

    that.assistanceRequested = function(message) {
        console.log("assistanceRequested");

        var data = {
            method: 'POST',
            url: that.serverRoot + '/assistance_requested',
            headers: {
                'content-type': 'application/json',
                'apikey': that.apiKey,
                'platform': that.platform,
                'clientkey': that.clientkey
            },

            json: {
                message: message
            }
        };
        rp(data);
    }


    that.hopIn = function(message) {

        var msg = that.structureMessage(message);
        if (msg) {
            console.log("hopIn");
            var data = {
                method: 'POST',
                url: that.serverRoot + '/track',
                headers: {
                    'content-type': 'application/json',
                    'apikey': that.apiKey,
                    'platform': that.platform,
                    'clientkey': that.clientkey,
                    'socket_id': that.getSocketId(),
                    'type':'in'
                },
                json: {
                    message: msg
                }
            };

            rp(data);
        }

    }

    that.hopOut = function(msg) {
        var message = that.structureMessage(msg);
        if (message) {
            console.log("hopOut");
        
            var data = {
                method: 'POST',
                url: that.serverRoot + '/track',
                headers: {
                    'content-type': 'application/json',
                    'apikey': that.apiKey,
                    'platform': that.platform,
                    'clientkey': that.clientkey,
                    'socket_id': that.getSocketId(),
                    'type':'out'
                },
                json: {
                    message: message
                }
            };

            setTimeout(function() {
                rp(data);
            }, 500);
        }
    }

    that.trigger = function(event, data) {
         if (debug) {
            console.log('handler:', event);
        }
        if (that.events[event]) {
            for (var e = 0; e < that.events[event].length; e++) {
                console.log(data);

                var res = that.events[event][e].apply(that, data);
                if (res === false) {
                    return;
                }
            }
        } else if (debug) {
            console.log('No handler for', event);
        }
    };



    that.on = function(event, cb) {
        var events = (typeof(event) == 'string') ? event.split(/\,/g) : event;

        for (var e in events) {
            if (!that.events[events[e]]) {
                that.events[events[e]] = [];
            }
            that.events[events[e]].push(cb);
        }
        return that;
    };


    that.checkForPaused = function(json, cb) {

        if (json.entry) {
            if (json.entry[0].messaging) {
                var facebook_message = json.entry[0].messaging[0];
                if (facebook_message.message) {
                    json = {
                        user: facebook_message.sender.id,
                        channel: facebook_message.sender.id
                    };
                }
            }
        }

        if (json.user && json.channel) {
            
            var headers = {
                            'content-type': 'application/json',
                            'apikey': that.apiKey,
                            'type': 'paused_check'
                        };

            if (that.token != "") {
                headers.token = that.token;
            }
        
            var data = {
                method: 'POST',
                url: that.serverRoot + '/is_channel_paused',
                headers: headers,
                json: json

            };


            rp(data).then(function (obj) {
                cb(obj);
            })
            .catch(function (err) {
                cb(null);
            });
        } else {
            cb(null);
        }
    }


    that.getSocketId = function () {
        return that.socketId;
    }

    that.setSocketId = function(socketId) {
        console.log("set socket : " + socketId);
        that.socketId = socketId;
    }


    socket.on('connect', function (message) {
        
        that.trigger('connect');
    });

    socket.on('message', function (message) {
        that.setSocketId(message);

        var data = {
            method: 'POST',
            url: that.serverRoot + '/update_bot_socket_id',
            headers: {
                'content-type': 'application/json',
                'apikey': that.apiKey,
                'type': 'connect'
            },

            json: {
                'socket_id': message,
                'clientkey': that.clientkey
                
            }

        };

        that.trigger('message');


        rp(data);

    });


    socket.on('failure log', function (msg) {
        var event = 'failure log';
        that.trigger(event, [msg]);
    });

  

    socket.on('chat response', function (msg) {
        var event = 'chat response';
        var message = {text:msg.text};
        if (msg.attachments) {
            message.attachments = msg.attachments;
        }
        message.channel = msg.sourceChannel.toUpperCase();
        message.type = "message";
        message.live = true;
        message.sourceTeam = msg.team;
        that.trigger(event, [message]);

    });

    socket.on('chat message', function (msg) {
        var event = 'chat message';
        that.trigger(event, [msg]);

    });

    socket.on('bot message', function (msg) {
        var event = 'bot message';
        that.trigger(event, [msg]);

    });

    socket.on('engage users', function (msg) {
        var event = 'engage users';
        that.trigger(event, [msg]);
    });

    socket.on('inactive channels message', function (msg) {
        var event = 'inactive channels message';
        that.trigger(event, [msg]);
    });

    socket.on('resumed channels message', function (msg) {
        var event = 'resumed channels message';
        that.trigger(event, [msg]);
    });

    socket.on('live chat request message', function (msg) {
        var event = 'live chat request message';
        that.trigger(event, [msg]);
    });

    return that;
}


function WordhopBotFacebook(wordhopbot, apiKey, serverRoot, controller, debug) {

    var that = this;
    wordhopbot.platform = 'messenger';

    if (wordhopbot.controller) {
        wordhopbot.controller.on('message_received', function(bot, message) {
            wordhopbot.logUnkownIntent(message);
        });
    }

    that.hopIn = function(obj, cb) {

        var forward = function(message, res) {
            if (message.type == null) {
                message.type = "message";
            }
            if (res) {
                message.paused = res.paused;
                message.user_profile = res.user_profile;
            }
            wordhopbot.hopIn(message);
        }

        wordhopbot.checkForPaused(obj, function(res) { 
            if (obj.entry) {
                for (var e = 0; e < obj.entry.length; e++) {
                    for (var m = 0; m < obj.entry[e].messaging.length; m++) {
                        var facebook_message = obj.entry[e].messaging[m];
                        if (facebook_message.message) {
                            var message = {
                                text: facebook_message.message.text,
                                user: facebook_message.sender.id,
                                channel: facebook_message.sender.id,
                                timestamp: facebook_message.timestamp,
                                seq: facebook_message.message.seq,
                                mid: facebook_message.message.mid,
                                sticker_id: facebook_message.message.sticker_id,
                                attachments: facebook_message.message.attachments,
                                quick_reply: facebook_message.message.quick_reply
                            };
                            forward(message, res);
                        }
                    }
                }
            } else {
                forward(obj, res);
            }

            var isPaused = false;
            if (res) {
                isPaused = res.paused;
            }
            if (cb) {
                cb(isPaused);
            } 
              
        });

    };


    that.hopOut = function(obj) {

        var message = obj;
        if (obj.message && obj.recipient) {

            message = {
                text: obj.message.text,
                channel: obj.recipient.id
            };
        }

        wordhopbot.hopOut(message);

    }

    // botkit middleware endpoints
    that.send = function(bot, message, next) {
        that.hopOut(message);
        next();   
    };

    that.receive = function(bot, message, next) {
        that.hopIn(message, function(msg) {
            next();
        });
    };

    that.logUnkownIntent = function(obj) {

        var message = obj;
        if (obj.message && obj.recipient) {

            message = {
                text: obj.message.text,
                user: obj.sender.id,
                channel: obj.sender.id,
                timestamp: obj.timestamp
            };

            message = wordhopbot.structureMessage(message);
        }

        wordhopbot.logUnkownIntent(message);

    }

    that.assistanceRequested = function(obj) {

        var message = obj;
        if (obj.message && obj.recipient) {

            message = {
                text: obj.message.text,
                user: obj.sender.id,
                channel: obj.sender.id,
                timestamp: obj.timestamp
            };
            message = wordhopbot.structureMessage(message);
        }


        wordhopbot.assistanceRequested(message);

    }
    

}

function WordhopBotSlack(wordhopbot, apiKey, serverRoot, controller, debug) {
    var that = this;

    wordhopbot.platform = 'slack';

    that.logConnect = function(message) {
        var data = {
            method: 'POST',
            url: that.serverRoot + '/track',
            headers: {
                'content-type': 'application/json',
                'apikey': wordhopbot.apiKey,
                'type': 'connect',
                'platform': wordhopbot.platform,
                'clientkey': wordhopbot.clientkey
            },
            json: {
                message: message
            }
        };
        rp(data);
    };

    that.hopIn = function(message, cb) {

        if (wordhopbot.checkIfMessage(message) == false) {
            return;
        }

        wordhopbot.checkForPaused(message, function(res) { 
            if (res) {
                message.paused = res.paused;
                message.user_profile = res.user_profile;
            }
            wordhopbot.hopIn(message);
            var isPaused = false;
            if (res) {
                isPaused = res.paused;
            }
            if (cb) {
                cb(isPaused);
            } 
        });
    };

    // botkit middleware endpoints
    that.send = function(bot, message, next) {
        if (message.user == null) {
            message.user = bot.identity.id;
        }
        that.hopOut(message);
        next();
    };

    // botkit middleware endpoints
    that.receive = function(bot, message, next) {  
        var message = that.modifiedMessage(message, bot);
        if (message.event) {
            that.hopIn(message, function(res) { 
                next();
            }); 
        } else {
            next();
        }       
    };

    that.modifiedMessage = function(message, bot) {
        if ('message' == message.type) {

            var mentionSyntax = '<@' + bot.identity.id + '(\\|' + bot.identity.name.replace('.', '\\.') + ')?>';
            var mention = new RegExp(mentionSyntax, 'i');
            var direct_mention = new RegExp('^' + mentionSyntax, 'i');


            if (message.text) {
                message.text = message.text.trim();
            }

            if (message.channel.match(/^D/)) {
                // this is a direct message
                if (message.user == bot.identity.id) {
                    return message;
                }
                if (!message.text) {
                    // message without text is probably an edit
                    return message;
                }

                // remove direct mention so the handler doesn't have to deal with it
                message.text = message.text.replace(direct_mention, '')
                .replace(/^\s+/, '').replace(/^\:\s+/, '').replace(/^\s+/, '');

                message.event = 'direct_message';
                return message;

            } else {
                if (message.user == bot.identity.id) {
                    return message;
                }
                if (!message.text) {
                    // message without text is probably an edit
                    return message;
                }

                if (message.text.match(direct_mention)) {
                    // this is a direct mention
                    message.text = message.text.replace(direct_mention, '')
                    .replace(/^\s+/, '').replace(/^\:\s+/, '').replace(/^\s+/, '');
                    message.event = 'direct_mention';
                    return message;
                } else if (message.text.match(mention)) {
                    //message.event = 'mention';
                    return message;
                } else {
                    //message.event = 'ambient';
                    return message;

                }
            }
        }
        return message;
    }


    if (wordhopbot.controller) {
        // reply to a direct mention
        wordhopbot.controller.on('direct_mention', function(bot, message) {
            wordhopbot.logUnkownIntent(message);
        });
        // reply to a direct message
        wordhopbot.controller.on('direct_message', function(bot, message) {
            wordhopbot.logUnkownIntent(message);
        });
    }

    that.hopOut = wordhopbot.hopOut;
    that.logUnkownIntent = wordhopbot.logUnkownIntent;
    that.assistanceRequested = wordhopbot.assistanceRequested;
    
    
    

}


module.exports = function(apiKey, clientkey, config) {

    if (!apiKey && !clientkey) {
        throw new Error('YOU MUST SUPPLY AN API_KEY AND A CLIENT_KEY TO WORDHOP!');
    }
    if (!apiKey) {
        throw new Error('YOU MUST SUPPLY AN API_KEY TO WORDHOP!');
    }
    if (!clientkey) {
        throw new Error('YOU MUST SUPPLY A CLIENT_KEY TO WORDHOP');
    }
    var serverRoot = 'https://wordhopapi.herokuapp.com';
    var socketServer = '"https://wordhop-socket-server.herokuapp.com"';
    var debug = false;
    var controller;
    var platform = 'slack';
    var token = '';
    if (config) {
        debug = config.debug;
        serverRoot = config.serverRoot || serverRoot;
        controller = config.controller;
        platform = config.platform || platform;
        socketServer = config.socketServer || socketServer;
        token = config.token || token;
    }
    var wordhopbot = WordhopBot(apiKey, serverRoot, socketServer, controller, clientkey, token, debug); 
    var wordhopObj;
    
    if (platform == 'slack') {
        wordhopObj = new WordhopBotSlack(wordhopbot, apiKey, serverRoot, controller, debug);
    } else if (platform == 'facebook' || platform == 'messenger') {
        platform = "messenger";
        wordhopObj = new WordhopBotFacebook(wordhopbot, apiKey, serverRoot, controller, debug);
    } else {
        throw new Error('platform not supported. please set it to be either "slack" or "messenger (alias: facebook)".');
    }

    wordhopObj.on = wordhopbot.on;
    wordhopObj.emit = wordhopbot.emit;
    wordhopObj.getSocketId = wordhopbot.getSocketId;
    wordhopObj.checkForPaused = wordhopbot.checkForPaused;
    return wordhopObj;
};