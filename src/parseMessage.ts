function unescape(input: string): string {
    let out: string = "";
    for (let i: number = 0; i < input.length; i++) {
        let char: string = input[i];
        if (char === "\\" && "\\srn".indexOf(input[i + 1]) !== -1) {
            switch(input[++i]) {
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

export type IRCTags = Record<string, string>;
export interface IIRCMessage {
    raw: string;
    tags: IRCTags;
    prefix: string|null;
    command: string;
    params: string[];
}

export interface IIRCParsingResult {
    message?: IIRCMessage;
    error?:  { error: Error, input: string };
}

export function parseMessages(message: string): IIRCParsingResult[] {
    const messages: IIRCParsingResult[] = [];
    let start: number = 0;
    for (let i: number = 0; i < message.length; i++) {
        if (message[i] === "\r" && message[i+1] === "\n") {
            const part: string = message.substring(start, i);
            messages.push(parseMessage(part));
            start = i = i + 2;
        }
    }
    return messages;
}

function find(token: string, str: string, start: number, reverse: boolean =  false): number {
    for (; start < str.length; start++) {
        if (reverse) {
            if (token !== str[start]) {
                break;
            }
        } else {
            if (token === str[start]) {
                break;
            }
        }
    }
    return start;
}

const nextNonspace: (str: string, start: number) => number = (str: string, start: number): number => find(" ", str, start, true);
const nextSpace: (str: string, start: number) => number = (str: string, start: number): number => find(" ", str, start);
function parseMessage(msg: string): IIRCParsingResult {
    const message: IIRCMessage = {
        raw: msg,
        tags: {},
        prefix: "", // @TODO(parse prefix)
        command: "",
        params: []
    };

    let start: number = 0;
    let pos: number = 0;
    const tags: IRCTags = message.tags;
    if (msg[pos] === "@") {
        let key: string = "";
        start = ++pos;
        for (; pos < msg.length; pos++) {
            let c: string = msg[pos];

            if (c === "=") {
                key = unescape(msg.substring(start, pos));
                start = pos + 1;
            }

            if (c === ";" || c === " ") {
                tags[key] = unescape(msg.substring(start, pos));
                start = pos + 1;
                if (c === " ") {
                    break;
                }
            }
        }
    }

    start = pos = nextNonspace(msg, pos);

    if (msg[pos] === ":") {
        pos = find(" ", msg, pos);
        message.prefix = msg.substring(start, pos);
    }

    pos = start = nextNonspace(msg, pos);
    pos = nextSpace(msg, pos);
    message.command = msg.substring(start, pos);

    pos = start = nextNonspace(msg, pos);

    while(pos < msg.length) {
        if (msg[pos] === ":") {
            message.params.push(msg.substring(++pos, msg.length));
            break;
        }
        pos = nextSpace(msg, pos);
        message.params.push(msg.substring(start, pos));
        start = ++pos;
        pos = nextNonspace(msg, pos);
    }


    return { message };
}
