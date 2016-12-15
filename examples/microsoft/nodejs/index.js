var restify = require('restify');
var builder = require('botbuilder');
require('dotenv').config();

var Wordhop = require('wordhop');
var apiKey = process.env.WORDHOP_API_KEY; // <= key provided by Wordhop for Slack
var clientKey = process.env.WORDHOP_CLIENT_KEY; // <= key provided by Wordhop for Slack
var botPlatform = 'microsoft'; // <= possible values: 'messenger', 'slack', 'microsoft'
var token = process.env.MESSENGER_PAGE_ACCESS_TOKEN; // <= to see profile image in transcript for Messenger channel, you must include
var wordhop = Wordhop(apiKey, clientKey, {platform: botPlatform, token:token});

//=========================================================
// Bot Setup
//=========================================================

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url); 
});
  
// Create chat bot
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});
var bot = new builder.UniversalBot(connector);
server.post('/botframework/receive', connector.listen());

//=========================================================
// Bots Dialogs
//=========================================================

// Handle forwarding the messages sent by a human through your bot
wordhop.on('chat response', function (message) {
    // Send notification as a proactive message
    sendIt(message, message.text);
});

var sendIt = function(session, text) {
    var msg = new builder.Message()
        .address(session.address)
        .text(text);
    bot.send(msg, function (err) {
    });
    wordhop.hopOut(msg.data);
}

var intents = new builder.IntentDialog();
bot.dialog('/', intents);

intents.matches(/^hi/i, function (session) {
    wordhop.hopIn(session.message, function(isBotPaused) {
      // If your bot is paused, stop it from replying
      if (isBotPaused) { return };
      sendIt(session.message, "Hello there.");
    });
});

intents.matches(/^help/i, function (session) {
    wordhop.hopIn(session.message, function(isBotPaused) {
      // If your bot is paused, stop it from replying
      if (isBotPaused) { return };
      // let the user know that they are being routed to a human                     
      sendIt(session.message, "Hang tight. Let me see what I can do.");
      // send a Wordhop alert to your slack channel
      // that the user could use assistance                      
      wordhop.assistanceRequested(session.message);
    });
});

intents.onDefault(function (session, args, next) {
    wordhop.hopIn(session.message, function(isBotPaused) {
      // If your bot is paused, stop it from replying
      if (isBotPaused) { return };
      // let the user know that the bot does not understand
      sendIt(session.message, "Huh?");
      // capture conversational dead-ends.
      wordhop.logUnkownIntent(session.message);
    });
    next();
});