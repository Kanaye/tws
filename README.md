# TWS
Note: For now this library is released under a "not stable" version, this is mostly because there are still missing tests and missing documentation (other than typings trough typescript and comments).

`TWS` is a *low lever* library for connecting to twitchs  WebSocket IRC gateway.
It 's *not* meant for direct usage when you are building for example a chat bot. But you can use it to either explore what happens "under the hood" or when you have high (application code)-size constraints and you don't need a lot of message "types" and don't need normalization for some quirks that can occur with twitchs API.

## What TWS does
It handles connections to the twitch chat relay including login, pings (to keep the connection alive) and reconnects.
It also parses and serializes IRC messages from their raw string form to an abstract object form.

## What TWS does not
It doesn't abstract away things like joining or leaving channels, userstates, sending messages, twitchs size constraints of messages. 

## Example usage
@TODO

## Documentation 
@TODO

