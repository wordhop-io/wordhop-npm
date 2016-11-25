# [Wordhop for Slack](https://www.wordhop.io) - For Chatbots built with custom Node.js

WHAT YOU WILL NEED TO GET STARTED:
* [A Slack Account](http://www.slack.com)
* [Wordhop for Slack](https://slack.com/oauth/authorize?scope=users:read,users:read.email,commands,chat:write:bot,channels:read,channels:write,bot&client_id=23850726983.39760486257)
* [A Slack app built with Node.js](https://developer.wordhop.io)

## Connect a Slack Chatbot built with custom Node.js to Wordhop 

Add the free Wordhop Slack app from [https://wordhop.io](https://wordhop.io) and  `Add a Bot`.  Provide a name for your bot and  `Add a Platform`.  Pick Slack as your platform. Then, open your terminal window and enter this:

```bash
npm install --save wordhop
```

Wordhop will automatically generate two keys for you and securely (via Slack auth) provide you those keys in the conversation. The first key is a Wordhop API key, and the second key is a bot-specific key.  Create an instance of a Wordhp object near the top of your code and include both keys:  

```javascript
var wordhop = require('wordhop')('WORDHOP_API_KEY','WORDHOP_BOT_KEY',{platform:'slack'});
```

When a message comes through on the websocket, you'll need to log the data with Wordhop with the `wordhop.hopIn` function. 

Note the callback has one argument: `isBotPaused`. Wordhop can pause your bot so that it doesn't auto response while a human has taken over. If this value is `true`, stop your bot from responding to an incoming message. Here is an example:

```javascript
////Example based on the ws WebSocket implementation.
//See https://www.npmjs.com/package/ws for more information.

this.ws.on('message', function(message) { 
     var parsed = JSON.parse(message);
     // Let Wordhop know when a message comes through 
     wordhop.hopIn(parsed, function(isBotPaused) {
        if (isBotPaused) { return };
        // Process incoming message
     });
    ...
```

When you send a reply on the websocket, tell Wordhop with the `wordhop.hopOut` function. Here's an example:

```javascript
var sendMessage = function(message) {
    // send a reply
    ws.send(JSON.stringify(message)); 
    // Log the reply with Wordhop
    wordhop.hopOut(message); 
}
            
var reply = { 
     type: 'message', 
     text: 'This is an outgoing message', 
     channel: parsed.channel 
};

sendMessage(reply);
...
```

To enable the ability to take over your bot, add the following lines below where you've previously defined `wordhop`:

```javascript
// Handle forwarding the messages sent by a human through your bot
wordhop.on('chat response', function (message) {
    // program your bot to pass on the human's message
    // e.g. sendMessage(message);
});
```

Find where in your code your bot processes incoming messages it does not understand. You may have some outgoing fallback message there (i.e. "Oops I didn't get that!"). Within that block of code, call to `wordhop.logUnkownIntent` to capture these conversational ‘dead-ends’. Here's an example:

```javascript
// match a greeting intent and send a response,
// otherwise log an unknown intent with Wordhop
if (parsed.text == 'hi' || parsed.text == 'hello') {
    var reply = { 
        type: 'message', 
        text: 'Hello yourself.', 
        channel: parsed.channel 
    }; 
    sendMessage(reply);

} else {
    var reply = { 
        type: 'message', 
        text: 'Huh?', 
        channel: parsed.channel 
    }; 
    // let the user know that the bot does not understand
    sendMessage(reply);
    // capture conversational ‘dead-ends’.
    wordhop.logUnkownIntent(parsed);
}
```

Wordhop can trigger alerts to suggest when a human should take over for your Chatbot. To enable this, create an intent such as when a customer explicitly requests live assistance, and then include the following line of code where your bot listens for this intent:

```javascript
// match an intent to talk to a real human
if (parsed.text == "help" || parsed.text == "operator") {
    // send a Wordhop alert to your slack channel
    // that the user could use assistance
    wordhop.assistanceRequested(parsed);
    // let the user know that they are being routed to a human
    var reply = { 
        type: 'message', 
        text: 'Hang tight. Let me see what I can do.', 
        channel: parsed.channel 
    }; 
    sendMessage(reply);
}
```
Go back to Slack and wait for alerts. That's it!

* [Example implementation using custom Node.js](https://github.com/wordhop-io/wordhop/blob/master/examples/slack_bot.js)
* [More on WebSockets](https://github.com/websockets/ws)
* [< README Index](../README.md)