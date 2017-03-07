'use strict';

var rp = require('request-promise');
var Promise = require("bluebird");

var checkIfString = function(myVar) {
    return (typeof myVar === 'string' || myVar instanceof String)
}

function WordhopBot(apiKey, serverRoot, path, socketServer, clientkey, token, useWebhook, debug) {
    var that = Object;
    
    that.apiKey = apiKey;
    that.serverRoot = serverRoot;
    that.path = path;
    that.debug = debug;
    that.clientkey = clientkey;
    that.token = token;
    that.useWebhook = useWebhook;
    if (that.useWebhook === false) {
        var io = require('socket.io-client');
        var socket = io.connect(socketServer);
        that.socket = socket;
        that.emit = function(event, message) {
            socket.emit(event, message);
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

        socket.on('channel update', function (msg) {
            var event = 'channel update';
            that.trigger(event, [msg]);
        });

        that.events = {};

        that.trigger = function(event, data) {
             if (debug) {
                console.log('handler:', event);
            }
            if (that.events[event]) {
                for (var e = 0; e < that.events[event].length; e++) {
                    
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

        that.getSocketId = function () {
            return that.socketId;
        }

        that.setSocketId = function(socketId) {
            that.socketId = socketId;
        }
    }
    
    that.checkIfMessage = function(msg) {
        var message = msg;
        if (message.entry) {
          if (message.entry[0].messaging) {
            var facebook_message = message.entry[0].messaging[0];
            if (facebook_message.message || facebook_message.postback) {
              return true;
            }
          }
        }
        if (message.postback) {
            return true;
        }
        if (msg.message && !checkIfString(msg.message)) {
            message = msg.message;
        }
        if  (msg.sourceEvent) {
            var slackMessage = msg.sourceEvent.SlackMessage;
            if (slackMessage) {
                message = slackMessage;
            } else if (msg.source == "facebook") {
                if (msg.sourceEvent.message) {
                    return true;
                }
            }
        }
        if (message.text == null) {
            message.text = "";
        }
        if ((message.type == 'user_message' || message.type == 'message' || message.type == 'facebook_postback' || message.type == null || message.page) &&
            message.transcript == null &&
            (message.subtype == null || message.subtype == "file_share") &&
            message.hasOwnProperty("reply_to") == false &&
            message.is_echo == null &&
            message.bot_id == null &&
            (message.text.length > 0 || message.attachments != null || message.attachment != null)) {
            return true;
        } else {
            return false;
        }
    }

    that.getClientKey = function(message) {
        var key = that.clientkey;
        if (message.client_key) {
            key = message.client_key;
        }
        return key;
    }

    that.logUnkownIntent = function(message) {
        if (that.checkIfMessage(message) == false) {
            return;
        }
        var data = {
            method: 'POST',
            url: that.serverRoot + that.path + 'unknown',
            headers: {
                'content-type': 'application/json',
                'apikey': that.apiKey,
                'platform': that.platform,
                'clientkey': that.getClientKey(message),
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
        var data = {
            method: 'POST',
            url: that.serverRoot + that.path + 'human',
            headers: {
                'content-type': 'application/json',
                'apikey': that.apiKey,
                'platform': that.platform,
                'clientkey': that.getClientKey(message)
            },
            json: message
        };
        return rp(data);
    }

    that.hopIn = function(message, reply) {
        if (that.checkIfMessage(message) == false) { 
            return Promise.resolve();
        }
        var data = {
            method: 'POST',
            url: that.serverRoot + that.path + 'in',
            headers: {
                'content-type': 'application/json',
                'apikey': that.apiKey,
                'platform': that.platform,
                'clientkey': that.getClientKey(message),
                'type':'in'
            },
            json: message
        };
        if (useWebhook === false) {
            data.headers.socket_id  = that.getSocketId();
        }
        if (reply) {
            data.json.reply  = reply;
        }
        if (that.token != "") {
            data.headers.token = that.token;
        }
        return rp(data);
    }

    that.hopOut = function(message) {
        if (that.checkIfMessage(message) == false) {
            return Promise.resolve();
        }
        var data = {
            method: 'POST',
            url: that.serverRoot + that.path + 'out',
            headers: {
                'content-type': 'application/json',
                'apikey': that.apiKey,
                'platform': that.platform,
                'clientkey': that.getClientKey(message),
                'type':'out'
            },
            json: message
        };
        if (useWebhook === false) {
            data.headers.socket_id  = that.getSocketId();
        }
        return rp(data);
    }

    

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
        return rp(data)
        .then(function (obj) {
            cb(obj);
        })
        .catch(function (err) {
            cb(null);
        });
    }

    that.query = function(message) {
        var headers = {
                        'content-type': 'application/json',
                        'apikey': that.apiKey,
                        'clientkey': that.clientkey
                    };
        var data = {
            method: 'POST',
            url: that.nlpURL + '/message',
            headers: headers,
            json: {incoming:  message.text}
        };
        return rp(data);
    }

    return that;
}


function WordhopBotFacebook(wordhopbot, controller, debug) {
    var that = this;
    that.controller = controller;
    if (that.controller) {
        that.controller.on('message_received', function(bot, message) {
            wordhopbot.logUnkownIntent(message);
        });
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
}


function WordhopBotMicrosoft(wordhopbot, controller, debug) {
    var that = this;
    that.controller = controller;
    if (that.controller) {
        that.controller.on('message_received', function(bot, message) {
            wordhopbot.logUnkownIntent(message);
        });
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
}

function WordhopBotSlack(wordhopbot, controller, debug) {
    var that = this;
    that.controller = controller;
    
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
        var msg = that.modifiedMessage(JSON.parse(JSON.stringify(message)), bot);
        
        that.hopIn(msg)
        .then(function (isPaused) {
            message.paused = isPaused;
            next();
        });
        
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

function isFunction(functionToCheck) {
    var getType = {};
    return functionToCheck && getType.toString.call(functionToCheck) === '[object Function]';
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
    var socketServer = 'https://wordhop-socket-server.herokuapp.com';
    var nlpURL = 'https://wordhop-chatterbot.herokuapp.com';
    var path = '/api/v1/';
    var debug = false;  
    var controller;
    var platform = 'slack';
    var token = '';
    var useWebhook = false;
    if (config) {
        debug = config.debug;
        serverRoot = config.serverRoot || serverRoot;
        nlpURL = config.nlpURL || nlpURL;
        controller = config.controller;
        platform = config.platform || platform;
        socketServer = config.socketServer || socketServer;
        token = config.token || token;
        useWebhook = config.useWebhook || useWebhook;
    }
    var wordhopbot = WordhopBot(apiKey, serverRoot, path, socketServer, clientkey, token, useWebhook, debug);
    wordhopbot.nlpURL = nlpURL;
    var wordhopObj;

    platform = platform.toLowerCase();
 
    if (platform == 'slack') {
        wordhopObj = new WordhopBotSlack(wordhopbot, controller, debug);
    } else if (platform == 'facebook' || platform == 'messenger') {
        platform = "messenger";
        wordhopObj = new WordhopBotFacebook(wordhopbot, controller, debug);
    } else if (platform == 'microsoft') {
        platform = "microsoft";
        wordhopObj = new WordhopBotMicrosoft(wordhopbot, controller, debug);
    } else {
        throw new Error('platform not supported. please set it to be either "slack" or "messenger (alias: facebook)".');
    }

    if (useWebhook === false) {
        wordhopObj.emit = wordhopbot.emit;
        wordhopObj.on = wordhopbot.on;
        wordhopObj.getSocketId = wordhopbot.getSocketId;
    }
    wordhopObj.checkForPaused = wordhopbot.checkForPaused;
    wordhopObj.logUnkownIntent = wordhopbot.logUnkownIntent;
    wordhopObj.assistanceRequested = wordhopbot.assistanceRequested;
    wordhopObj.query = wordhopbot.query;
    wordhopObj.socket = wordhopbot.socket;
    wordhopbot.platform = platform;
    

    
    wordhopObj.hopIn = function(message, arg1, arg2) {
        var cb;
        var reply;
        if (isFunction(arg1)) {
            cb = arg1;
        } else {
            reply = arg1;
            cb = arg2;
        }
        return wordhopbot.hopIn(message, reply)
        .then(function (obj) {
            var isPaused = false;
            if (obj) {
                isPaused = obj.paused;
            } 
            message.paused = isPaused;
            if (cb) {
                cb(isPaused);
            } 
            return Promise.resolve(isPaused);
        })
        .catch(function (err) {
            if (cb) {
                cb(false);
            } 
            return Promise.reject();
        });
    };

    wordhopObj.hopOut = function(message, cb) {
        return wordhopbot.hopOut(message)
        .then(function (obj) {
            if (cb) {
                cb(true);
            } 
            return Promise.resolve(true);
        })
        .catch(function (err) {
            if (cb) {
                cb(false);
            } 
            return Promise.reject();
        });
    };

    wordhopObj.setPlatform = function(platform) {
        if (platform == 'facebook' || platform == 'messenger') {
            platform = "messenger";
        }
        if (platform === 'slack' || platform === 'messenger' || platform === 'microsoft') {
            wordhopbot.platform = platform;
        }
    }
    
    return wordhopObj;
};