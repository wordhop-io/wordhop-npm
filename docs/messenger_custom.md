# [Wordhop for Messenger](https://www.wordhop.io) - For Chatbots built with custom Node.js

WHAT YOU WILL NEED TO GET STARTED:
* [A Slack Account](http://www.slack.com)
* [Wordhop for Slack](https://slack.com/oauth/authorize?scope=users:read,users:read.email,commands,chat:write:bot,channels:read,channels:write,bot&client_id=23850726983.39760486257)
* [A messaging Chatbot built with custom Node.js](https://github.com/fbsamples/messenger-platform-samples/tree/master/node)

## Connect a Facebook Messenger Chatbot built with custom Node.js to Wordhop 

Add the free Wordhop Slack app from [https://wordhop.io](https://wordhop.io) and `Add a Bot`.  Provide a name for your bot and `Add a Platform`.  Pick Messenger as your platform. Then, open your terminal window and enter this:

```bash
npm install --save wordhop
```

Create an instance of a Wordhop object near the top of your code as seen below. Wordhop will give you two keys. The first is your API Key and the second is a bot-specific key for each bot you add. If you want to see your bot's users names and profiles included in the transcripts, also include the Messenger page access token. You can generate this token on the Messenger App Dashboard.

```javascript
var wordhop = require('wordhop')(WORDHOP_API_KEY,WORDHOP_BOT_KEY,{platform:'messenger',
        token:PAGE_ACCESS_TOKEN});
```


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

* [Example implementation with custom Node.js](https://github.com/wordhop-io/wordhop/blob/master/examples/messenger_bot.js)
* [More Messenger examples](https://github.com/fbsamples/messenger-platform-samples/tree/master/node)
* [More on WebSockets](https://github.com/websockets/ws)
* [< README Index](./README.md)
