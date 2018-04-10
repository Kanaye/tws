import SimpleEventEmitter from "./SimpleEventEmitter";

const ReSplitIRCMessage = /(?:@([^\n\s]+)\s+)?(?::([^\n\s]+)\s+)?([^\n\s]+)\s+?([^\n]+)?/;
const ReTagEscaped = /\\([\\srn])/g;

const unescapeKey = (_: string, key: string): string => {
    switch(key) {
        case '\\':
            return '\\';
        case 's':
            return ' ';
        case 'r':
            return '\r';
        case 'n':
            return '\n';
        default:
            throw new Error(`"${key}, ${_}"`);
    }
};

const unescape = (str: string) => str.replace(ReTagEscaped, unescapeKey);
export type IIRCMessage = any;
export type IRCTags = Record<string, string>;
export interface IIRCParsingResult {
    success: boolean;
    result?: IIRCMessage;
    error?: Error;
}

export function parseMessages(message: string): IIRCParsingResult[] {
    return message.split('\n')
        .filter(line => line.trim().length)
        .map(line => {
            try {
                return {
                    success: true,
                    result: parseMessage(line)
                };
            } catch(error) {
                return {
                    error,
                    success: false
                }
            }
        });
}

function parseMessage(msg: string): IIRCMessage {
    const result = ReSplitIRCMessage.exec(msg);
    if (result == null) throw new Error(`Invalid IRC Message "${msg}"`);
    const [_, rawTags, prefix, command, params] = result;
    const message = {
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
    if (tags == null) return result;
    tags.split(';')
        .forEach(tag => {
            const [key, value] = unescape(tag).split('=');
            result[key] = value;
        });
    return result;
}