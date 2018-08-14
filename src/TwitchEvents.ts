import { IParsedIRCMessage, IServerPrefix, IUserPrefix } from "./irc/index";

interface IConnectMessage<T extends string> extends IParsedIRCMessage {
  command: T;
  params: [string, string];
  prefix: IServerPrefix;
}
// unfortunatly twitch doesn't always send tags at all
// don't know why but I encountered messages that should have contained certain tags (regarding twitchs docs)
type Tags<T extends string | number | symbol> = Record<T, string | undefined>;

type Key = string | number | symbol;

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
  prefix: undefined;
}

export interface IPong extends IParsedIRCMessage {
  command: "PONG";
  params: ["tmi.twitch.tv", string];
  prefix: IServerPrefix;
}

export type ChannelMessageTagKeys =
  | "badges"
  | "bits"
  | "color"
  | "display-name"
  | "emotes"
  | "id"
  | "message"
  | "mod"
  | "room-id"
  | "subscriber"
  | "tmi-sent-ts"
  | "turbo"
  | "user-id"
  | "user-type";
export type ChannelMessageTags = Tags<ChannelMessageTagKeys>;
// general chat message
export interface IPrivmsg extends IParsedIRCMessage {
  command: "PRIVMSG";
  params: [string, string];
  prefix: IUserPrefix;
  tags: ChannelMessageTags;
}

export type WhisperMessageTagKeys =
  | Exclude<"id" | "room-id" | "subscriber" | "tmi-send-ts", ChannelMessageTagKeys>
  | "message-id"
  | "thread-id";
export type WhisperMessageTags = Tags<WhisperMessageTagKeys>;

export interface IWhisper extends IParsedIRCMessage {
  command: "WHISPER";
  prefix: IUserPrefix;
  params: [string, string];
  tags: WhisperMessageTags;
}

export type UserStateTagKeys =
  | "badges"
  | "color"
  | "display-name"
  | "emote-stes"
  | "mod"
  | "subscriber"
  | "user-type";
export type UserStateTags = Tags<UserStateTagKeys>;

export interface IUserstate extends IParsedIRCMessage {
  command: "USERSTATE";
  prefix: IServerPrefix;
  params: [string];
  tags: UserStateTags;
}

export type RoomStateTagKeys =
  | "broadcaster-lang"
  | "emote-only"
  | "followers-only"
  | "r9k"
  | "rituals"
  | "room-id"
  | "slow"
  | "subs-only";
export type RoomStateTags = Tags<RoomStateTagKeys>;

export interface IRoomstate extends IParsedIRCMessage {
  command: "ROOMSTATE";
  prefix: IServerPrefix;
  params: [string];
  tags: RoomStateTags;
}
// channel join
export interface IJoin extends IParsedIRCMessage {
  command: "JOIN";
  prefix: IUserPrefix;
  params: [string];
}
// channel leave
export interface IPart extends IParsedIRCMessage {
  command: "PART";
  prefix: IUserPrefix;
  prarams: [string];
}

export interface IReconnect extends IParsedIRCMessage {
  command: "RECONNECT";
  prefix: IServerPrefix;
  params: [];
}

export type UserNoticeTagKeys =
  | "badges"
  | "color"
  | "display-name"
  | "emotes"
  | "id"
  | "login"
  | "message"
  | "mod"
  | "msg-id"
  | "msg-param-displayName"
  | "msg-param-login"
  | "msg-param-months"
  | "msg-param-recipient-display-name"
  | "msg-param-recipient-id"
  | "msg-param-recipient-user-name"
  | "msg-param-sub-plan"
  | "msg-param-sub-plan-name"
  | "msg-param-viewerCount"
  | "msg-param-ritual-name"
  | "room-id"
  | "subscriber"
  | "system-msg"
  | "tmi-sent-ts"
  | "turbo"
  | "user-id"
  | "user-type";
export type UserNoticeTags = Tags<UserNoticeTagKeys>;
// Subscriptions
export interface IUsernotice {
  command: "USERNOTICE";
  params: [string] | [string, string];
  tags: UserNoticeTags;
  prefix: IServerPrefix;
}

export type GlobalUserStateTagKeys =
  | "badges"
  | "color"
  | "display-name"
  | "emote-sets"
  | "turbo"
  | "user-id"
  | "user-type";
export type GlobalUserStateTags = Tags<GlobalUserStateTagKeys>;

export interface IGlobalUserState {
  command: "GLOBALUSERSTATE";
  params: [];
  tags: GlobalUserStateTags;
  prefix: IServerPrefix;
}

export type ClearchatTagKeys = "ban-duration" | "ban-reason";
export type ClearchatTags = Tags<ClearchatTagKeys>;
interface IClearchat {
  command: "CLEARCHAT";
  params: [string];
  tags: ClearchatTags;
  prefix: IServerPrefix;
}

export interface IHosttarget {
  command: "HOSTTARGET";
  params: [string] | [string, string];
  prefix: IServerPrefix;
}

export interface INotice {
  command: "NOTICE";
  tags: Record<
    "msg-id",
    | "already_banned"
    | "already_emote_only_off"
    | "already_emote_only_on"
    | "already_r9k_off"
    | "already_r9k_on"
    | "already_subs_off"
    | "already_subs_on"
    | "bad_host_hosting"
    | "ban_success"
    | "bad_unban_no_ban"
    | "emote_only_off"
    | "emote_only_on"
    | "host_off"
    | "host_on"
    | "hosts_remaining"
    | "msg_channel_suspended"
    | "r9k_off"
    | "r9k_on"
    | "slow_off"
    | "slow_on"
    | "subs_off"
    | "subs_on"
    | "timeout_success"
    | "unban_success"
    | "unrecognized_cmd"
  >;
  prefix: IServerPrefix;
  params: [string, string];
}

export interface IMode {
  command: "MODE";
  prefix: IUserPrefix;
  params: [string, string, string];
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
  cap: ICap;
  pimg: IPing;
  pong: IPong;
  privmsg: IPrivmsg;
  whisper: IWhisper;
  userstate: IUserstate;
  roomstate: IRoomstate;
  join: IJoin;
  part: IPart;
  reconnect: IReconnect;
  usernotice: IUsernotice;
  globaluserstate: IGlobalUserState;
  clearchat: IClearchat;
  hosttarget: IHosttarget;
  notice: INotice;
}

export type TwitchCommands = keyof ITwitchEventMap;
