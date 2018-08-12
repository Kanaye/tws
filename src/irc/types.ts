export type IRCTags = Record<string, string>;

export interface IUserPrefix {
    nick: string;
    user?: string;
    host?: string;
    kind: "user";
}

export interface IServerPrefix {
    server: string;
    kind: "server";
}

export type Prefix = IServerPrefix | IUserPrefix;

export interface IIRCMessage {
    tags?: IRCTags;
    prefix?: Prefix;
    command: string;
    params: string[];
}

export interface IParsedIRCMessage extends IIRCMessage {
    raw: string;
}
