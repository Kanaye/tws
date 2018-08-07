

function unescape(input: string): string {
    let out = "";
    for (let i = 0; i < input.length; i++) {
        let char = input[i];
        if (char == "\\" && "\\srn".indexOf(input[i + 1]) != -1) {
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
    prefix: string;
    command: string;
    params: string[];
}

export interface IIRCParsingResult {
    message?: IIRCMessage;
    error?:  { error: Error, input: string };
}

export function parseMessages(message: string): IIRCParsingResult[] {
    const messages: IIRCParsingResult[] = [];
    let start = 0;
    for (let i = 0; i < message.length; i++) {
        if (message[i] == "\n" || message[i] == "\r") {
            const part = message.substring(start, i);
            messages.push(parseMessage(part));
            start = ++i;
        }
    }
    console.log({ r: message }, messages.map( m => (m.message as IIRCMessage).raw ));
    return messages;
}

const find = (token: string, str: string, start: number, reverse: boolean =  false): number => {
    for (; start < str.length; start++) {
        if (reverse) {
            if (token !== str[start]) {
                break;
            }
        } else {
            if (token == str[start]) {
                break;
            }
        }
    }
    return start;
}
const nextNonspace = (str: string, start: number): number => find(" ", str, start, true);
const nextSpace = (str: string, start: number): number => find(" ", str, start);
function parseMessage(msg: string): IIRCParsingResult {
    const message: IIRCMessage = {
        raw: msg,
        tags: {},
        prefix: "", // @TODO(parse prefix)
        command: "",
        params: []
    };

    let start = 0;
    let pos = 0;
    const tags = message.tags;
    if (msg[pos] == "@") {
        let key = "";
        for (pos++; pos < msg.length; pos++) {
            if (msg[pos] == "=") {
                key = unescape(msg.substr(start, pos));
                start = pos;
            }
            if (msg[pos] == ";" || msg[pos] == " ") {
                tags[key] = unescape(msg.substring(start, pos));
                if (msg[pos] == " ") {
                    break;
                }
            }
        }
    }

    start = pos = nextNonspace(msg, pos);

    if (msg[pos] == ":") {
        pos = find(" ", msg, pos);
        message.prefix = msg.substring(start, pos); 
    }
    
    pos = start = nextNonspace(msg, pos);
    pos = nextSpace(msg, pos);
    message.command = msg.substring(start, pos);

    pos = start = nextNonspace(msg, pos);
    
    while(msg[pos] == ':') {
        pos = nextSpace(msg, pos);
        if (pos >= msg.length) break;
        message.params.push(msg.substring(start, pos));
        start = pos = nextNonspace(msg, pos);
    }

    message.params.push(msg.substring(start, msg.length));

    return { message };
}
