import { contains, find, nextNonspace, nextSpace } from "../utilities";
import { IParsedIRCMessage, IRCTags, Prefix } from "./types";

const enum Chars {
    LINE_BREAK = 10,
    CARRIAGE_RETURN = 13,
    SPACE = 32,
    EXCLAMATION = 33,
    DOT = 46,
    COLON = 58,
    SEMICOLON = 59,
    EQUAL = 61,
    AT = 64,
    BACKSLASH = 92
}

type NextSearch = (str: string, start: number, fallback?: number) => number;

interface IIRCParsingResult {
    message?: IParsedIRCMessage;
    error?: { error: Error; input: string };
}
export type OnMessageFn = (msg: IParsedIRCMessage) => void;
export type OnParsingErrorFn = (error: Error, input: string) => void;
export function parseMessages(
    message: string,
    onMessage: OnMessageFn,
    onParsingError: OnParsingErrorFn
): void {
    let start: number = 0;
    for (let i: number = 0; i < message.length; i++) {
        if (
            message.charCodeAt(i) === Chars.CARRIAGE_RETURN &&
            message.charCodeAt(i + 1) === Chars.LINE_BREAK
        ) {
            const part: string = message.substring(start, i);
            tryParse(part, onMessage, onParsingError);
            start = i = i + 2;
        }
    }
    if (start < message.length - 2) {
        tryParse(message.substring(start, message.length), onMessage, onParsingError);
    }
}

function tryParse(part: string, onMessage: OnMessageFn, onError: OnParsingErrorFn) {
    const result = parseMessage(part);
    if (result.message) {
        onMessage(result.message);
    } else if (result.error) {
        onError(result.error.error, result.error.input);
    }
}
export function parseMessage(msg: string): IIRCParsingResult {
    try {
        return {
            message: internalParseMessage(msg)
        };
    } catch (error) {
        return { error: { error, input: msg } };
    }
}

function internalParseMessage(msg: string): IParsedIRCMessage {
    const message: IParsedIRCMessage = {
        command: "",
        params: [],
        raw: msg
    };

    let start: number = 0;
    let pos: number = 0;

    if (msg.charCodeAt(pos) === Chars.AT) {
        const tags: IRCTags = (message.tags = {});
        start = ++pos;
        let key: string = "";

        for (; pos < msg.length; pos++) {
            const c: number = msg.charCodeAt(pos);
            if (c === Chars.EQUAL) {
                key = unescape(msg.substring(start, pos));
                start = pos + 1;
            }

            if (c === Chars.SEMICOLON || c === Chars.SPACE) {
                tags[key] = unescape(msg.substring(start, pos));
                start = pos + 1;
                if (c === Chars.SPACE) {
                    break;
                }
            }
        }
    }

    start = pos = nextNonspace(msg, pos);

    if (msg[pos] === ":") {
        pos = nextSpace(msg, pos);
        const prefix: string = msg.substring(++start, pos);
        let userOffset: number | undefined;
        let hostOffset: number | undefined;
        let msgPrefix: Prefix;
        try {
            userOffset = find("!", prefix, 0);
            hostOffset = find("@", prefix, userOffset);
            // tslint:disable:no-empty
        } catch (_) {}

        if (!userOffset) {
            if (contains(".", prefix)) {
                msgPrefix = { kind: "server", server: prefix };
            } else {
                msgPrefix = { kind: "user", nick: prefix };
            }
        } else {
            msgPrefix = { kind: "user", nick: prefix.substring(0, userOffset) };
            if (!hostOffset) {
                msgPrefix.user = prefix.substring(++userOffset, prefix.length);
            } else {
                msgPrefix.user = prefix.substring(++userOffset, hostOffset);
                msgPrefix.host = prefix.substring(++hostOffset, prefix.length);
            }
        }
        message.prefix = msgPrefix;
    }

    pos = start = nextNonspace(msg, pos);
    pos = nextSpace(msg, pos);
    message.command = msg.substring(start, pos);

    while (pos < msg.length) {
        start = pos = nextNonspace(msg, pos);
        if (msg[pos] === ":") {
            message.params.push(msg.substring(++pos, msg.length));
            break;
        }
        pos = nextSpace(msg, pos, msg.length);
        message.params.push(msg.substring(start, pos));
    }
    return message;
}

function unescape(input: string): string {
    let out: string = "";
    for (let i: number = 0; i < input.length; i++) {
        let char: string = input[i];
        if (char === "\\" && "\\srn".indexOf(input[i + 1]) !== -1) {
            switch (input[++i]) {
                case "\\":
                    break;
                case "s":
                    char = " ";
                    break;
                case "r":
                    char = "\r";
                    break;
                case "n":
                    char = "\n";
            }
        }
        out += char;
    }
    return out;
}
