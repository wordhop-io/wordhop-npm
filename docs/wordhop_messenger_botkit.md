# [Wordhop for Messenger](https://www.wordhop.io) - For Chatbots built with Botkit

WHAT YOU WILL NEED TO GET STARTED:
* [A Slack Account](http://www.slack.com)
* [Wordhop for Slack](https://slack.com/oauth/authorize?scope=users:read,users:read.email,commands,chat:write:bot,channels:read,channels:write,bot&client_id=23850726983.39760486257)
* [A messaging Chatbot built with Botkit](https://github.com/howdyai/botkit)

## Connect a Facebook Messenger Chatbot built with Botkit to Wordhop 

Add the free Wordhop Slack app from [https://wordhop.io](https://wordhop.io) and `Add a Bot`.  Provide a name for your bot and `Add a Platform`.  Pick Messenger as your platform. Then, open your terminal window and enter this:

```bash
npm install --save wordhop
```

Create an instance of a Wordhop object near the top of your code as seen below. Wordhop will give you two keys. The first is your API Key and the second is a bot-specific key for each bot you add. If you want to see your bot's users names and profiles included in the transcripts, also include the Messenger page access token. You can generate this token on the Messenger App Dashboard.

```javascript
var wordhop = require('wordhop')(WORDHOP_API_KEY,WORDHOP_BOT_KEY,{platform:'messenger',
        token:PAGE_ACCESS_TOKEN});
```


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

* [Example implementation using Botkit](https://github.com/wordhop-io/wordhop/blob/master/examples/messenger_bot_botkit.js)
* [More Messenger examples](https://github.com/fbsamples/messenger-platform-samples/tree/master/node)
* [More on WebSockets](https://github.com/websockets/ws)
* [< README Index](../README.md)
