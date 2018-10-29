import { IParsedIRCMessage } from "./irc/index";
/**
 * A raw message with the serialized message and the recerive/send date.
 */
export interface IRawMessageEvent {
    /**
     * The raw, serialized IRC Message.
     */
    message: string;
    /**
     * The datetime the message has been received or send.
     */
    date: Date;
}

export interface ITwsEventmap {
    /**
     * Emitted when a serialized message is sent.
     */
    "raw-send": IRawMessageEvent;
    /**
     * Emitted when a message got received.
     */
    "raw-receive": IRawMessageEvent;
    /**
     * Emitted when a message got received and parsed.
     */
    receive: IParsedIRCMessage;
    /**
     * Emitted when ever a received IRC Message could not be parsed.
     */
    "parsing-error": {
        /**
         * The error why the message couldn't be parsed.
         */
        error: Error;
        /**
         * The input that couldn't be parsed.
         */
        input: string;
    };
    /**
     * Emitted when a pong is received from twitch.
     * The value is the delay/lag in milliseconds.
     */
    pong: number;
    /**
     * Emitted when a new connection to twitch got opened.
     */
    open: null;
    /**
     * Emitted when a connection got closed.
     */
    close: null;
    /**
     * Emitted when a new connection will be opened.
     * Either because the connection just closed or
     * because twitch send a "reconnect" command.
     */
    reconnect: null;
    /**
     * Emitted when an error occured in processing.
     */
    error: Error;
}
