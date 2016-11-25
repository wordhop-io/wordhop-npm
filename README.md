# [Wordhop](https://www.wordhop.io) - A Customer Service Toolkit Built For Messaging

Wordhop is an intuitive customer service layer built on Slack with real-time synchronization to Chatbots across platforms. You can easily connect Chatbots you're building to a Slack team so you can scale customer service with bots while delighting your customers with humans.  Tag team with your Chatbot on conversations to improve engagement and monetization and access reports that help you find and fix problems fast in your conversational experience.

IMPORTANT --> YOU WILL NEED:
* A Slack Team: [Slack](http://www.slack.com)
* Wordhop For Slack [Wordhop on Slack](https://slack.com/oauth/authorize?scope=users:read,commands,chat:write:bot,channels:write,bot&client_id=23850726983.39760486257)
* A Chatbot created with Node.js [Build a Chatbot](https://developer.wordhop.io/botbuilders.html)

When you add Wordhop to Slack, the Wordhop Chatbot will give you API keys for these supported Chatbot platforms:
* [Facebook Messenger](https://developers.facebook.com)
* [Slack](https://api.slack.com)
* [Other platform? email us](mailto:support@wordhop.io)

## 1.0 Connect a Facebook Messenger app to Wordhop

Add the free Wordhop Slack app from [https://wordhop.io](https://wordhop.io) and `Add a Bot`.  Provide a name for your bot and `Add a Platform`.  Pick Messenger as your platform. Then, open your terminal window and enter this:

```bash
npm install --save wordhop
```

Create an instance of a Wordhop object near the top of your code as seen below. Wordhop will give you two keys. The first is your API Key and the second is a bot-specific key for each bot you add. If you want to see your bot's users names and profiles included in the transcripts, also include the Messenger page access token. You can generate this token on the Messenger App Dashboard.

```javascript
var wordhop = require('wordhop')(WORDHOP_API_KEY,WORDHOP_BOT_KEY,{platform:'messenger',
        token:PAGE_ACCESS_TOKEN});
```


### 1.1 For a Messenger app built with Botkit

Add the following lines below where you've previously defined `controller` and `wordhop`:

```javascript
controller.middleware.receive.use(wordhop.receive); 
controller.middleware.send.use(wordhop.send);

// Handle forwarding the messages sent by a human through your bot
wordhop.on('chat response', function (message) {
    bot.say(message);
});
```

Find where in your code your bot processes incoming messages it does not understand. You may have some outgoing fallback message there (i.e. "Oops I didn't get that!"). Within that block of code, include the following line of code to capture these conversational ‘dead-ends’:

```javascript
wordhop.logUnkownIntent(message);
```

Wordhop can trigger alerts to suggest when a human should take over for your Chatbot. To enable this, create an intent such as when a customer explicitly requests live assistance, and then include the following line of code where your bot listens for this intent:

```javascript
wordhop.assistanceRequested(message);
```

Wordhop can pause your bot so that it doesn't auto response while a human has taken over. To enable this, add the following line of code before you trigger your bot to respond. 

```javascript
if (message.paused) { return };
```

Go back to Slack and wait for alerts. That's it!

Here is an example implementation using Botkit:
https://github.com/mnatha/wordhop/examples/messenger_bot_botkit.js


### 1.2 For a Messenger app NOT built with Botkit


When Messenger calls your receiving webhook, you'll need to log the data with Wordhop with the `wordhop.hopIn` function. 

Note the callback has one argument: `isBotPaused`. Wordhop can pause your bot so that it doesn't auto response while a human has taken over. If this value is `true`, stop your bot from responding to an incoming message. Here is an example:

```javascript
app.post('/webhook', function (req, res) {
     var data = req.body; 
     // Let Wordhop know when a message comes in 
     wordhop.hopIn(data, function(isBotPaused) {
        if (isBotPaused) { return };
        // Process incoming message
     });
    ...
```

Each time your bot sends a message, make sure to log that with Wordhop in the request's callback. Here is an example:
```javascript
request({
    uri: 'https://graph.facebook.com/v2.6/me/messages',
    qs: { access_token: PAGE_ACCESS_TOKEN },
    method: 'POST',
    json: messageData

  }, function (error, response, body) {

    wordhop.hopOut(messageData); 
    ...
```

To enable the ability to take over your bot, add the following lines below where you've previously defined `wordhop`:

```javascript
// Handle forwarding the messages sent by a human through your bot
wordhop.on('chat response', function (message) {
    // program your bot to pass on the human's message
    // e.g. sendTextMessage(message.channel, message.text);
});
```

Find where in your code your bot processes incoming messages it does not understand. You may have some outgoing fallback message there (i.e. "Oops I didn't get that!"). Within that block of code, call to `wordhop.logUnkownIntent` to capture these conversational ‘dead-ends’. Here's an example:

```javascript
// match a greeting intent and send a response,
// otherwise log an unknown intent with Wordhop
if (messageText == "hi" || messageText == "hello") {
    sendTextMessage(senderID, "Hello there.");
} else {
    // capture conversational ‘dead-ends’.
    wordhop.logUnkownIntent(event);
    // let the user know that the bot does not understand
    sendTextMessage(senderID, "Huh?");
} 
```

Wordhop can trigger alerts to suggest when a human should take over for your Chatbot. To enable this, create an intent such as when a customer explicitly requests live assistance, and then include the following line of code where your bot listens for this intent:

```javascript
// match an intent to talk to a real human
if (messageText == "help" || messageText == "operator") {
    // send a Wordhop alert to your slack channel
    // that the user could use assistance
    wordhop.assistanceRequested(event);
    // let the user know that they are being routed to a human
    sendTextMessage(senderID, "Hang tight. Let me see what I can do.");
}
```

Go back to Slack and wait for alerts. That's it!

Here's an example implementation based on 
`https://github.com/fbsamples/messenger-platform-samples/tree/master/node`
https://github.com/mnatha/wordhop/examples/messenger_bot.js



## 2.0 Connect a Slack app to Wordhop

Add the free Wordhop Slack app from [https://wordhop.io](https://wordhop.io) and  `Add a Bot`.  Provide a name for your bot and  `Add a Platform`.  Pick Slack as your platform. Then, open your terminal window and enter this:

```bash
npm install --save wordhop
```

Wordhop will automatically generate two keys for you and securely (via Slack auth) provide you those keys in the conversation. The first key is a Wordhop API key, and the second key is a bot-specific key.  Create an instance of a Wordhp object near the top of your code and include both keys:  

```javascript
var wordhop = require('wordhop')('WORDHOP_API_KEY','WORDHOP_BOT_KEY',{platform:'slack'});
```


### 2.1 For a Slack app built with Botkit


Add the following lines below where you've previously defined `controller` and `wordhop`:

```javascript
controller.middleware.receive.use(wordhop.receive); 
controller.middleware.send.use(wordhop.send);

// Handle forwarding the messages sent by a human through your bot
wordhop.on('chat response', function (message) {
    bot.say(message);
});
```

Find where in your code your bot processes incoming messages it does not understand. You may have some outgoing fallback message there (i.e. "Oops I didn't get that!"). Within that block of code, include the following line of code to capture these conversational ‘dead-ends’:

```javascript
wordhop.logUnkownIntent(message);
```

Wordhop can trigger alerts to suggest when a human should take over for your Chatbot. To enable this, create an intent such as when a customer explicitly requests live assistance, and then include the following line of code where your bot listens for this intent:

```javascript
wordhop.assistanceRequested(message);
```

Wordhop can pause your bot so that it doesn't auto response while a human has taken over. To enable this, add the following line of code before you trigger your bot to respond. 

```javascript
if (message.paused) { return };
```

Go back to Slack and wait for alerts. That's it!

Here is an example implementation using Botkit:
https://github.com/mnatha/wordhop/examples/slack_bot_botkit.js


### 2.2 For a Slack app not built with Botkit

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

Here's an example:
https://github.com/mnatha/wordhop/examples/slack_bot.js

=======================
That's all for now. Questions?  Feedback?  
* [Email Support](mailto://support.wordhop.io)

