import { IIRCMessage, IServerPrefix, IUserPrefix } from "./parseMessage";

interface IConnectMessage<T extends string> extends IIRCMessage {
    command: T;
    params: [string, string];
    prefix: IServerPrefix;
}

export type Connect001 = IConnectMessage<"001">;
export type Connect002 = IConnectMessage<"002">;
export type Connect003 = IConnectMessage<"003">;
export type Connect004 = IConnectMessage<"004">;
export type Connect372 = IConnectMessage<"372">;
export type Connect375 = IConnectMessage<"375">;
export type Connect376 = IConnectMessage<"376">;

export interface IUserlistBeginn extends IIRCMessage {
    command: "353";
    prefix: IServerPrefix;
    params: [string, "=", string, string];
}

export interface IUserlistEnd extends IIRCMessage {
    command: "366";
    prefix: IServerPrefix;
    params: [string, string, "End of /NAMES list"];
}

export interface ICap extends IIRCMessage {
    command: "CAP";
    params: ["*", "ACK", string];
    prefix: IServerPrefix;
}

export interface IPing extends IIRCMessage {
    command: "PING";
    params: ["tmi.twitch.tv"];
    prefix: null;
}

export interface IPong extends IIRCMessage {
    command: "PONG";
    params: ["tmi.twitch.tv", string];
    prefix: IServerPrefix;
}

export type ChannelMessageTagKey = "badges" | "color" | "display-name" | "emotes" | "id" | "mod" | "room-id" | "subscriber" | "tmi-sent-ts" | "turbo" | "user-id" | "user-type";

export type ChannelMessageTags = Record<ChannelMessageTagKey, string>;

export interface IPrivmsg extends IIRCMessage {
    command: "PRIVMSG";
    params: [string, string];
    prefix: IUserPrefix;
    tags: ChannelMessageTags;
}

export interface ITwitchEventMap {
    "001": Connect001;
    "002": Connect002;
    "003": Connect003;
    "004": Connect004;
    "353": IUserlistBeginn;
    "366": IUserlistEnd;
    "372": Connect372;
    "375": Connect375;
    "376": Connect376;
    "cap": ICap;
    "pimg": IPing;
    "pong": IPong;
    "privmsg": IPrivmsg;
}

export type TwitchCommands = keyof ITwitchEventMap;