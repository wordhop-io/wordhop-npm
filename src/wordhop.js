'use strict';

var rp = require('request-promise');
var Promise = require("bluebird");
var io = require('socket.io-client');

function WordhopBot(apiKey, serverRoot, path, socketServer, clientkey, token, debug) {
    var that = Object;
    var socket = io.connect(socketServer);
    that.apiKey = apiKey;
    that.serverRoot = serverRoot;
    that.path = path;
    that.debug = debug;
    that.clientkey = clientkey;
    that.token = token;
    that.events = {};

    that.emit = function(event, message) {
        socket.emit(event, message);
    }

    that.checkIfMessage = function(msg) {
        var message = msg;
        if (message.entry) {
          if (message.entry[0].messaging) {
            var facebook_message = message.entry[0].messaging[0];
            if (facebook_message.message) {
              return true;
            }
          }
        }
        if (msg.message) {
            message = msg.message;
        }
        if (message.text == null) {
            message.text = "";
        }
        if ((message.type === 'user_message' || message.type === 'message' || message.type == null || message.page) &&
            message.transcript == null &&
            (message.subtype == null || message.subtype === "file_share") &&
            message.hasOwnProperty("reply_to") == false &&
            message.is_echo == null &&
            message.bot_id == null &&
            (message.text.length > 0 || message.attachments != null || message.attachment != null)) {
            return true;
        } else {
            return false;
        }
    }

    that.logUnkownIntent = function(message) {
        if (that.checkIfMessage(message) == false) {
            return;
        }
        console.log("logUnkownIntent");
        var data = {
            method: 'POST',
            url: that.serverRoot + that.path + 'unknown',
            headers: {
                'content-type': 'application/json',
                'apikey': that.apiKey,
                'platform': that.platform,
                'clientkey': that.clientkey,
                'failure': true,
                'type':'unknown'
            },
            json: message
        };
        return rp(data);
    }

    that.assistanceRequested = function(message) {
        if (that.checkIfMessage(message) == false) {
            return Promise.resolve();
        }
        console.log("assistanceRequested");
        var data = {
            method: 'POST',
            url: that.serverRoot + that.path + 'human',
            headers: {
                'content-type': 'application/json',
                'apikey': that.apiKey,
                'platform': that.platform,
                'clientkey': that.clientkey
            },
            json: message
        };
        return rp(data);
    }

    that.hopIn = function(message) {
        if (that.checkIfMessage(message) == false) {
            return Promise.resolve();
        }
        console.log("hopIn");
        var data = {
            method: 'POST',
            url: that.serverRoot + that.path + 'in',
            headers: {
                'content-type': 'application/json',
                'apikey': that.apiKey,
                'platform': that.platform,
                'clientkey': that.clientkey,
                'socket_id': that.getSocketId(),
                'type':'in'
            },
            json: message
        };
        if (that.token != "") {
            data.headers.token = that.token;
        }
        console.log(data);
        return rp(data);
    }

    that.hopOut = function(message) {
        if (that.checkIfMessage(message) == false) {
            return;
        }
        console.log("hopOut");
        var data = {
            method: 'POST',
            url: that.serverRoot + that.path + 'out',
            headers: {
                'content-type': 'application/json',
                'apikey': that.apiKey,
                'platform': that.platform,
                'clientkey': that.clientkey,
                'socket_id': that.getSocketId(),
                'type':'out'
            },
            json: message
        };

        setTimeout(function() {
            rp(data);
        }, 500);
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

    that.checkForPaused = function(channel, cb) {
        var headers = {
                        'content-type': 'application/json',
                        'apikey': that.apiKey,
                        'clientkey': that.clientkey,
                        'type': 'paused_check'
                    };
        var data = {
            method: 'POST',
            url: that.serverRoot + that.path + 'channel_state',
            headers: headers,
            json: {"channel": channel}
        };
        rp(data).then(function (obj) {
            cb(obj);
        })
        .catch(function (err) {
            cb(null);
        });
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

    socket.on('socket_id_set', function (socket_id) {
        that.setSocketId(socket_id);
        var data = {
            method: 'POST',
            url: that.serverRoot + that.path + 'update_bot_socket_id',
            headers: {
                'content-type': 'application/json',
                'apikey': that.apiKey,
                'clientkey': that.clientkey,         
                'type': 'connect'
            },
            json: {'socket_id': socket_id}
        };
        that.trigger('socket_id_set');
        rp(data);
    });

    socket.on('chat response', function (msg) {
        var event = 'chat response';
        that.trigger(event, [msg]);
    });

    socket.on('failure log', function (msg) {
        var event = 'failure log';
        that.trigger(event, [msg]);
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


function WordhopBotFacebook(wordhopbot, controller, debug) {
    var that = this;
    that.controller = controller;
    wordhopbot.platform = 'messenger';
    if (that.controller) {
        that.controller.on('message_received', function(bot, message) {
            wordhopbot.logUnkownIntent(message);
        });
    }
    
    that.hopIn = function(message, cb) {
        wordhopbot.hopIn(message).then(function (obj) {
            var isPaused = true;
            if (obj) {
                message.paused = obj.paused;
                isPaused = obj.paused;
            }
            if (cb) {
                cb(isPaused);
            } 
        })
        .catch(function (err) {
            cb(false);
        });
    };

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
}

function WordhopBotSlack(wordhopbot, controller, debug) {
    var that = this;
    wordhopbot.platform = 'slack';
    that.controller = controller;

    that.hopIn = function(message, cb) {
        wordhopbot.hopIn(message).then(function (obj) {
            var isPaused = true;
            if (obj) {
                isPaused = obj.paused;
            } 
            message.paused = isPaused;
            if (cb) {
                cb(isPaused);
            } 
        })
        .catch(function (err) {
            cb(false);
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
    if (that.controller) {
        // reply to a direct mention
        that.controller.on('direct_mention', function(bot, message) {
            wordhopbot.logUnkownIntent(message);
        });
        // reply to a direct message
        that.controller.on('direct_message', function(bot, message) {
            wordhopbot.logUnkownIntent(message);
        });
    }
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
    var serverRoot = 'https://developer.wordhop.io';
    var socketServer = 'https://wordhop-socket-server.herokuapp.com';
    var path = '/api/v1/';
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
    var wordhopbot = WordhopBot(apiKey, serverRoot, path, socketServer, clientkey, token, debug); 
    var wordhopObj;

    platform = platform.toLowerCase();
    
    if (platform == 'slack') {
        wordhopObj = new WordhopBotSlack(wordhopbot, controller, debug);
    } else if (platform == 'facebook' || platform == 'messenger') {
        platform = "messenger";
        wordhopObj = new WordhopBotFacebook(wordhopbot, controller, debug);
    } else {
        throw new Error('platform not supported. please set it to be either "slack" or "messenger (alias: facebook)".');
    }

    wordhopObj.on = wordhopbot.on;
    wordhopObj.emit = wordhopbot.emit;
    wordhopObj.getSocketId = wordhopbot.getSocketId;
    wordhopObj.checkForPaused = wordhopbot.checkForPaused;
    wordhopObj.hopOut = wordhopbot.hopOut;
    wordhopObj.logUnkownIntent = wordhopbot.logUnkownIntent;
    wordhopObj.assistanceRequested = wordhopbot.assistanceRequested;
    
    return wordhopObj;
};