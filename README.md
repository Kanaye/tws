# TWS

[![Greenkeeper badge](https://badges.greenkeeper.io/jancba/tws.svg)](https://greenkeeper.io/)
[![Build Status](https://travis-ci.org/jancba/tws.svg?branch=master)](https://travis-ci.org/jancba/tws)

Note: For now this library is released under a "not stable" version, this is mostly because there are still missing tests and missing documentation (other than typings trough typescript and comments).

`TWS` is a *low level* library for connecting to twitchs  WebSocket IRC gateway.
It 's *not* meant for direct usage when you are building for example a chat bot. But you can use it to either explore what happens "under the hood" or when you have high (application code)-size constraints and you don't need a lot of message "types" and don't need normalization for some quirks that can occur with twitchs API.

## What TWS does provide
It handles connections to the twitch chat relay including login, pings (to keep the connection alive) and reconnects.
It also parses and serializes IRC messages from their raw string form to an abstract object form.

## What TWS does not provide
It doesn't abstract away things like joining or leaving channels, userstates, sending messages, twitchs size constraints of messages. 

## Example usage
```js
import Tws from "tws";

const tws = new Tws(/* possible options here */);

// wait until a connection to twitch got opened
// then send a join command to #somechannel
// replace #somechannel with a real channelname
tws.on("open", () => {
    tws.send({
        command: "JOIN",
        params: ["#somechannel"]
    });
});

// everytime a "privmsg" event (channel chat messages & actions) is received
// log its sender, channel and content to the console.
tws.twitch.on("privmsg", e => {
    const [channel, message] = e.params;
    const sender =  e.prefix.nick;
    console.log(`${sender}@${channel}: ${message}`);
});


tws.connect().then(() => console.log("Connected!"));

```

## Documentation 
@TODO

