
var express = require('express');
var app = express();

var request = require('request');

var wordhop = require('wordhop')(process.env.WORDHOP_API_KEY,process.env.WORDHOP_BOT_KEY,
    {platform:'slack'});


var WebSocket = require('ws');


//start
app.listen(3000, function(){
    console.log('Starting...');
    console.log('argument: ');
    startListening();
});



function startListening(){

    //call rtm.start to initiate session
    request.post({url:'https://slack.com/api/rtm.start', 
        form: {token:process.env.token, no_unreads:'true'}}, function(err,res,body){ 
        
        if(err){
            console.log(err);
        }else{    

            //parse the returned body 
            obj = JSON.parse(body);
                
            //create new websocket to connect to RTM using URL returned from RTM.start 
            ws = new WebSocket(obj.url); 

            var sendMessage = function(message) {
                // send a reply
                ws.send(JSON.stringify(message)); 
                // Log the reply with Wordhop
                wordhop.hopOut(message); 
            }

            //open websocket connection to Slack rtm api - error handling?
            ws.on('open', function() {
                console.log('Websocket opened');    
            });

            // Handle forwarding the messages sent by a human through your bot
            wordhop.on('chat response', function (message) { 
                // program your bot to pass on the human's message
                sendMessage(message);
            });

            //listen for activity on Slack 
            ws.on('message', function(message) {

                var parsed = JSON.parse(message);
                
                //easy tp parse events by type
                if (parsed.type == 'hello') {
                    
                    //First hello returned. Proper connected
                    console.log('Connection established');

                } else if (parsed.type=='message') {
                    // Let Wordhop know when a message comes through 
                    wordhop.hopIn(parsed, function(isPaused) {
                        if (isPaused) { return };
                        // Process incoming message

                        // match a greeting intent and send a response
                        if(parsed.text == 'hi' || parsed.text == 'hello'){
                            console.log('INFO: received "hi"');
                            var reply = { 
                                  type: 'message', 
                                   text: 'Hello there.', 
                                 channel: parsed.channel 
                            }; 
                            sendMessage(reply);

                        }
                        // match an intent to talk to a real human
                        else if (parsed.text == "help" || parsed.text == "operator") {
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
                        // otherwise log an unknown intent with Wordhop
                        else {

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
                    });
                }
            }); 
        }
    });
}