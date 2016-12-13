var restify = require('restify');
var builder = require('botbuilder');
require('dotenv').config();

var Wordhop = require('wordhop');
var apiKey = process.env.WORDHOP_API_KEY; // <= key provided by Wordhop for Slack
var clientKey = process.env.WORDHOP_CLIENT_KEY; // <= key provided by Wordhop for Slack
var botPlatform = 'messenger'; // <= possible values: 'messenger', 'slack'
var wordhop = Wordhop(apiKey, clientKey, {platform: botPlatform});

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
server.post('/api/messages', connector.listen());

//=========================================================
// Bots Dialogs
//=========================================================

// Handle forwarding the messages sent by a human through your bot
wordhop.on('chat response', function (outgoingMessage) {
    
    // Send notification as a proactive message
    var msg = new builder.Message()
        .address(outgoingMessage.channel)
        .text(outgoingMessage.text);
    bot.send(msg, function (err) {
        // Return success/failure
        res.status(err ? 500 : 200);
        res.end();
    });
});

var sendIt = function(session, text) {
    session.send(text);
    var outgoingMessage = {
        "channel": session.message.user.id,
        "text": text
    }
    wordhop.hopOut(outgoingMessage);
}

bot.dialog('/', function (session) {
    console.log(session);
    //session.send("Hello World");
    
    wordhop.hopIn(session.message, function(isBotPaused) {
      console.log("paused? " + isBotPaused);
      // If your bot is paused, stop it from replying
      if (isBotPaused) { return };
      sendIt(session, "Hello there.");
    });
});