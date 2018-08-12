import { IParsedIRCMessage, IServerPrefix, IUserPrefix } from "./irc/index";

interface IConnectMessage<T extends string> extends IParsedIRCMessage {
    command: T;
    params: [string, string];
    prefix: IServerPrefix;
}
type Tags<T extends string | number | symbol> = Record<T, string>;

export type Connect001 = IConnectMessage<"001">;
export type Connect002 = IConnectMessage<"002">;
export type Connect003 = IConnectMessage<"003">;
export type Connect004 = IConnectMessage<"004">;
export type Connect372 = IConnectMessage<"372">;
export type Connect375 = IConnectMessage<"375">;
export type Connect376 = IConnectMessage<"376">;

export interface IUserlistBeginn extends IParsedIRCMessage {
    command: "353";
    prefix: IServerPrefix;
    params: [string, "=", string, string];
}

export interface IUserlistEnd extends IParsedIRCMessage {
    command: "366";
    prefix: IServerPrefix;
    params: [string, string, "End of /NAMES list"];
}

export interface ICap extends IParsedIRCMessage {
    command: "CAP";
    params: ["*", "ACK", string];
    prefix: IServerPrefix;
}

export interface IPing extends IParsedIRCMessage {
    command: "PING";
    params: ["tmi.twitch.tv"];
    prefix: null;
}

export interface IPong extends IParsedIRCMessage {
    command: "PONG";
    params: ["tmi.twitch.tv", string];
    prefix: IServerPrefix;
}

export type ChannelMessageTagKeys = "badges" | "color" | "display-name" | "emotes" | "id" | "mod" | "room-id" | "subscriber" | "tmi-sent-ts" | "turbo" | "user-id" | "user-type";
export type ChannelMessageTags = Tags<ChannelMessageTagKeys>;

export interface IPrivmsg extends IParsedIRCMessage {
    command: "PRIVMSG";
    params: [string, string];
    prefix: IUserPrefix;
    tags: ChannelMessageTags;
}

export type WhisperMessageTagKeys = Exclude<"id" | "room-id" | "subscriber" | "tmi-send-ts", ChannelMessageTagKeys> | "message-id" | "thread-id";
export type WhisperMessageTags = Tags<WhisperMessageTagKeys>;

export interface IWhisper extends IParsedIRCMessage {
    command: "WHISPER";
    prefix: IUserPrefix;
    params: [string, string];
    tags: WhisperMessageTags; 
}

export type UserStateTagKeys = "badges" | "color" | "display-name" | "emote-stes" | "mod" | "subscriber" | "user-type";
export type UserStateTags = Tags<UserStateTagKeys>;

export interface IUserstate extends IParsedIRCMessage {
    command: "USERSTATE";
    prefix: IServerPrefix;
    params: [string];
    tags: UserStateTags;
}

export type RoomStateTagKeys = "broadcaster-lang" | "emote-only" | "followers-only" | "r9k" | "rituals" | "room-id" | "slow" | "subs-only";
export type RoomStateTags = Tags<RoomStateTagKeys>;

export interface IRoomstate extends IParsedIRCMessage {
    command: "ROOMSTATE";
    prefix: IServerPrefix;
    params: [string];
    tags: RoomStateTags;
}

export interface IJoin extends IParsedIRCMessage {
    command: "JOIN";
    prefix: IUserPrefix;
    params: [string];
}

export interface IPart extends IParsedIRCMessage {
    command: "PART";
    prefix: IUserPrefix;
    prarams: [string];
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
    "whisper": IWhisper;
    "userstate": IUserstate;
    "roomstate": IRoomstate;
    "join": IJoin;
    "part": IPart;
}


export type TwitchCommands = keyof ITwitchEventMap;