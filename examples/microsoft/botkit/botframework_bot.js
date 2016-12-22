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

controller.setupWebserver(process.env.port || 3978, function(err, webserver) {
    controller.createWebhookEndpoints(webserver, bot, function() {
        console.log('ONLINE!');
        if(ops.lt) {
            var tunnel = localtunnel(process.env.port || 3978, {subdomain: ops.ltsubdomain}, function(err, tunnel) {
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
controller.hears(['help', 'operator', 'human'], 'message_received', function(bot, message) {
    // Forwards request to talk to a human to Wordhop
    wordhop.assistanceRequested(message);
});

// give the bot something to listen for.
controller.hears(['hello', 'hi'], 'message_received', function(bot, message) {
    // If your bot is paused, stop it from replying
    if (message.paused) { return };
    bot.reply(message,'Hello there.');
});

// Handle receiving a message
controller.on(['direct_mention','message_received'],function(bot,message) { 
    // log an unknown intent with Wordhop
    wordhop.logUnkownIntent(message); 
    bot.reply(message, 'huh?');
}); 
