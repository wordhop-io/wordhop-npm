/*~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
           ______     ______     ______   __  __     __     ______
          /\  == \   /\  __ \   /\__  _\ /\ \/ /    /\ \   /\__  _\
          \ \  __<   \ \ \/\ \  \/_/\ \/ \ \  _"-.  \ \ \  \/_/\ \/
           \ \_____\  \ \_____\    \ \_\  \ \_\ \_\  \ \_\    \ \_\
            \/_____/   \/_____/     \/_/   \/_/\/_/   \/_/     \/_/


This is a sample Microsoft Bot Framework bot built with Botkit.

This bot demonstrates many of the core features of Botkit:

* Connect to the Microsoft Bot Framework Service
* Receive messages based on "spoken" patterns
* Reply to messages
* Use the conversation system to ask questions
* Use the built in storage system to store and retrieve information
  for a user.

# RUN THE BOT:

  Follow the instructions in the "Getting Started" section of the readme-botframework.md file to register your bot.

  Run your bot from the command line:

    app_id=<MY APP ID> app_password=<MY APP PASSWORD> node botframework_bot.js [--lt [--ltsubdomain LOCALTUNNEL_SUBDOMAIN]]

  Use the --lt option to make your bot available on the web through localtunnel.me.

# USE THE BOT:

  Find your bot inside Skype to send it a direct message.

  Say: "Hello"

  The bot will reply "Hello!"

  Say: "who are you?"

  The bot will tell you its name, where it running, and for how long.

  Say: "Call me <nickname>"

  Tell the bot your nickname. Now you are friends.

  Say: "who am I?"

  The bot will tell you your nickname, if it knows one for you.

  Say: "shutdown"

  The bot will ask if you are sure, and then shut itself down.

  Make sure to invite your bot into other channels using /invite @<my bot>!

# EXTEND THE BOT:

  Botkit has many features for building cool and useful bots!

  Read all about it here:

    -> http://howdy.ai/botkit

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/

require('dotenv').config();

var Botkit = require('botkit');
var os = require('os');
var commandLineArgs = require('command-line-args');
var localtunnel = require('localtunnel');

var Wordhop = require('wordhop');
var apiKey = process.env.WORDHOP_API_KEY; // <= key provided by Wordhop for Slack
var clientKey = process.env.WORDHOP_CLIENT_KEY; // <= key provided by Wordhop for Slack
var botPlatform = 'microsoft'; // <= possible values: 'messenger', 'slack', 'microsoft'
var token = process.env.MESSENGER_PAGE_ACCESS_TOKEN; // <= to see profile image in transcript for Messenger channel, you must include
var wordhop = Wordhop(apiKey, clientKey, {platform: botPlatform, token:token});

var apiai = require('apiai');
var apiaiapp = apiai(process.env.APIAI_TOKEN);


const ops = commandLineArgs([
      {name: 'lt', alias: 'l', args: 1, description: 'Use localtunnel.me to make your bot available on the web.',
      type: Boolean, defaultValue: false},
      {name: 'ltsubdomain', alias: 's', args: 1,
      description: 'Custom subdomain for the localtunnel.me URL. This option can only be used together with --lt.',
      type: String, defaultValue: null},
   ]);

if(ops.lt === false && ops.ltsubdomain !== null) {
    console.log("error: --ltsubdomain can only be used together with --lt.");
    process.exit();
}

var controller = Botkit.botframeworkbot({
    debug: true
});

var bot = controller.spawn({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});

controller.setupWebserver(process.env.PORT || 3978, function(err, webserver) {
    controller.createWebhookEndpoints(webserver, bot, function() {
        console.log('ONLINE!');
        if(ops.lt) {
            var tunnel = localtunnel(process.env.PORT || 3978, {subdomain: ops.ltsubdomain}, function(err, tunnel) {
                if (err) {
                    console.log(err);
                    process.exit();
                }
                console.log("Your bot is available on the web at the following URL: " + tunnel.url + '/botframework/receive');
            });

            tunnel.on('close', function() {
                console.log("Your bot is no longer available on the web at the localtunnnel.me URL.");
                process.exit();
            });
        }
    });
});


// Add the wordhop middleware 
controller.middleware.receive.use(wordhop.receive); 
controller.middleware.send.use(wordhop.send);

// Handle forwarding the messages sent by a human through your bot
wordhop.on('chat response', function (message) {
    // Send notification as a proactive message
    bot.say(message);
});


// Listens for an intent whereby a user wants to talk to a human
controller.hears(['help', 'operator', 'human', 'demo'], 'message_received', function(bot, message) {
    // Forwards request to talk to a human to Wordhop
    wordhop.assistanceRequested(message);
    //incoming(bot, message, "Let me see if I can connect you to a live agent.");
    bot.reply(message, "Let me see if I can connect you to a live agent.")
    
});


// Handle receiving a message
controller.on(['direct_mention','message_received'],function(bot,message) { 
    // log an unknown intent with Wordhop
    incoming(bot, message, "Sorry, can you rephrase that?");
}); 


function sendMessage(bot, message, reply) {

	if (message.paused) { return };
    
        
    if (message.payload || message.user == null) {

        if (reply.attachments) {
            console.log(message);
            bot.say({channel:message.channel, text: reply.text, attachments: reply.attachments});
        }
         else {
            bot.say({channel:message.channel, text: reply});
        }

    } 
    else if (!bot.res && message.user) {
        bot.reply(message,reply);     
    } 
    else if (message.user) {
        bot.replyPrivate(message,reply);
    }
     
}


function incoming(bot, message, defaultReply) {
	var input = message.text;
    
    console.log("input: "+input);
    console.log(message);

    if (input === undefined) {
        return;
    }

  

    var words = input.split(" ", 3);
  

    if (input.length > 255) {
        console.log("log unknown intent");
        wordhop.logUnkownIntent(message);
        return;

    }

    if (input == ":rabbit:") {
        sendMessage(bot, message, "Yup, that's me!");
        return;
    }

    
    if (input.toLowerCase() == "start over") {
        input = "clear";
    }

	var trequest = apiaiapp.textRequest(input, {sessionId:message.user});
    trequest.on('response', function(response) {
        console.log(response);
        console.log(JSON.stringify(response.result.contexts));
        apiaiResponse(bot, message, response, defaultReply);
    });
    trequest.on('error', function(error) {
        console.log(error);
        wordhop.logUnkownIntent(message);
        sendMessage(bot, message, defaultReply);
    });
    trequest.end();
}



function apiaiResponse(bot, message, response, defaultReply) {

    console.log("apiaiResponse");

    var text = response.result.fulfillment.speech;

    text = text.replace(/\\n/g, "\n");
    text = text.replace(/\\t/g, "\t");

    if ((response.result.metadata.intentId == null && text == "") || (response.result.metadata.intentId && response.result.score < 0.56)){
        console.log("log unknown intent");
        chatterbot(bot, message, defaultReply);
    } 
    else if (response.result.action == "help") {
        sendMessage(bot, message, text);
    }
    else if (response.result.action == "smalltalk.greetings") {
        sendMessage(bot, message, text);
    }
    else if (response.result.action == "input.unknown") {
        console.log("logging unknown intent")
        chatterbot(bot, message, defaultReply);
    }
    else if (text != "")  {
        sendMessage(bot, message, text);
    }
    else {
        console.log("log unknown intent");
        chatterbot(bot, message, defaultReply);
    }

}

function chatterbot(bot, message, defaultReply)  {
	var data = {
      method: 'POST',
      url: 'https://wordhop-chatterbot.herokuapp.com/message',
      headers: {
          'content-type': 'application/json',
          clientkey:  clientKey,
          incoming:  message.text
      }
    };
    console.log(data);
    var request = require("request");
    request(data, function(error, response, body) {
        console.log("body");
        var obj = JSON.parse(body);
        if (obj.response && obj.confidence > 0.5) {
          sendMessage(bot, message, obj.response);
        } else {
       	  wordhop.logUnkownIntent(message);
        
          sendMessage(bot, message, defaultReply);
        }
        console.log(body);
    });
}
