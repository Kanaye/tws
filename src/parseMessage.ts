import SimpleEventEmitter from "./SimpleEventEmitter";

const ReSplitIRCMessage: RegExp = /(?:@([^\n\s]+)\s+)?(?::([^\n\s]+)\s+)?([^\n\s]+)\s+?([^\n]+)?/;
const ReTagEscaped: RegExp = /\\([\\srn])/g;

function unescapeKey(_: string, key: string): string {
    switch (key) {
        case "\\":
            return "\\";
        case "s":
            return " ";
        case "r":
            return "\r";
        case "n":
            return "\n";
        default:
            throw new Error(`"${key}, ${_}"`);
    }
}

const unescape: (str: string) => string = (str: string) => str.replace(ReTagEscaped, unescapeKey);
export type IRCTags = Record<string, string>;
export interface IIRCMessage {
    raw: string;
    tags: IRCTags;
    prefix: string;
    command: string;
    params: string;
}

export interface IIRCParsingResult {
    success: boolean;
    message?: IIRCMessage;
    error?: Error;
}

export function parseMessages(message: string): IIRCParsingResult[] {
    return message.split("\n")
        .filter(line => line.trim().length)
        .map(line => {
            try {
                return {
                    success: true,
                    message: parseMessage(line)
                };
            } catch (error) {
                return {
                    error,
                    success: false
                };
            }
        });
}

function parseMessage(msg: string): IIRCMessage {
    const result: RegExpExecArray | null = ReSplitIRCMessage.exec(msg);
    if (result == null) {

        throw new Error(`Invalid IRC Message "${msg}"`);
    }
    const [_, rawTags, prefix, command, params] = result;
    const message: IIRCMessage = {
        raw: msg,
        tags: parseTags(rawTags),
        prefix, // @TODO(parse prefix)
        command,
        params
    };
    return message;
}

function parseTags(tags?: string): IRCTags {
    const result: IRCTags = {};
    if (tags == null) {
         return result;
    }
    tags.split(";")
        .forEach(tag => {
            const [key, value] = unescape(tag).split("=");
            result[key] = value;
        });
    return result;
}