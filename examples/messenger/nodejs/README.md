# [Wordhop](https://www.wordhop.io) Messenger Bot Node.js Example

This is a simple Messenger bot built with Botkit and Wordhop integration example, based on [Facebook's example](https://github.com/fbsamples/messenger-platform-samples).

### Sign Up With Wordhop

You'll need an API key from Wordhop, as well as a Client Key for each Chatbot.  You can get both of those (free) when you add [Wordhop for Slack](https://slack.com/oauth/authorize?scope=users:read,users:read.email,commands,chat:write:bot,channels:read,channels:write,bot&client_id=23850726983.39760486257) via through a conversation with the Wordhop bot. 

### Register for an Access Token

You'll need to setup a [Facebook App](https://developers.facebook.com/apps/), Facebook Page, get the Page Access Token and link the App to the Page before you can really start to use the Send/Receive service.
[This quickstart guide should help](https://developers.facebook.com/docs/messenger-platform/quickstart)

### Installation

```bash
$ npm install
```

### Usage

As early as possible in your application, require and configure dotenv.

```javascript
require('dotenv').config();
```

Create a `.env` file in the root directory of your project. Add
environment-specific variables on new lines in the form of `NAME=VALUE`.
For example:

```
WORDHOP_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
WORDHOP_CLIENT_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
MESSENGER_PAGE_ACCESS_TOKEN=bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
MESSENGER_VALIDATION_TOKEN=xxxxxxxxxxxxxxxxxxxx
MESSENGER_APP_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SERVER_URL=https://yourserver.com
```
Run the following command to get your bot online:

```bash
$ npm start
```