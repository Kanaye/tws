import SimpleEventEmitter from "./TypedEventEmitter";
import { parseMessages, serializeMessage, IParsedIRCMessage, IIRCMessage } from "./irc/index";
import { awaitEvent } from "./utilities";
import { ITwitchEventMap, TwitchCommands } from "./TwitchEvents";
import WebSocketManager, { IOptions as WSManagerOptions } from "./WebSocketManager";

export interface IAuth {
    username: string;
    password: string;
}
/**
 *
 */
export interface ICompleteTwsOptions {
    auth: IAuth;
    url: string;
    pingInterval: number;
    connectionOptions: WSManagerOptions;
    eventTimeout: number;
}

export type ITwsOptions = Partial<ICompleteTwsOptions>;

const defaultSettings: ICompleteTwsOptions = {
    get auth(): IAuth {
        return {
            username: `justinfan${Math.random().toFixed(6).substr(-6)}`, // random "justinfan" user (anonymous)
            password: "blah" // value twitch uses for anonymous chat logins
        };
    },
    get connectionOptions(): WSManagerOptions {
        return {
            reconnect: {
                auto: true,
                retries: 5,
                delay: 5e3
            }
        };
    },
    url: "wss://irc-ws.chat.twitch.tv/",
    pingInterval: 15e3,
    eventTimeout: 3e3
};

export interface IRawMessageEvent {
    message: string;
    date: Date;
}

export interface ITwsEventmap {
    "raw-send": IRawMessageEvent;
    "raw-receive": IRawMessageEvent;
    "receive": IParsedIRCMessage;
    "parsing-error": {
        error: Error;
        input: string;
    };
    "pong": number;
    "open": null;
    "close": null;
    "reconnect": null;
    "error": Error;
}

export default class Tws extends SimpleEventEmitter<ITwsEventmap> {
    private _loggedIn: boolean = false;
    private ws: WebSocketManager;
    private options: ICompleteTwsOptions;
    private pingInterval: number | NodeJS.Timer | undefined;
    public twitch: SimpleEventEmitter<ITwitchEventMap> = new SimpleEventEmitter();
    private createdAt: number = Date.now();

    reconnecting: boolean = false;

    constructor(options: ITwsOptions = {}) {
        super();
        this.options = Object.assign({}, defaultSettings, options);

        const ws: WebSocketManager = this.ws = new WebSocketManager(this.options.url, this.options.connectionOptions);

        ws.on("open", async () => {
            const { auth, eventTimeout } = this.options;
            // request all Twitch IRC Capabilities
            // see https://dev.twitch.tv/docs/irc/#twitch-specific-irc-capabilities
            this.sendRaw("CAP REQ :twitch.tv/tags twitch.tv/membership twitch.tv/commands");
            try {
                await awaitEvent(this.twitch, "cap", eventTimeout);
            } catch(e) {
                this.emit("error", e);
                this.ws.close();
                return;
            }

            // perform login
            this.sendRaw(`PASS ${auth.password}`);
            this.sendRaw(`NICK ${auth.username}`);
            // await first line of "motd"
            try {
                await awaitEvent(this.twitch, "001", eventTimeout);
            } catch(e) {
                this.ws.close();
                this.emit("error", e);
                return;
            }
            this._loggedIn = true;
            this.emit("open", null);
        });

        ws.on("reconnect", () => {
            this._loggedIn = false;
            this.emit("reconnect", null);
        });

        ws.on("message", (msg: string) => {
            this.emit("raw-receive", {
                date: new Date(),
                message: msg
            });

            parseMessages(msg, (m: IParsedIRCMessage) => {
                this.emit("receive", m);
                const command: TwitchCommands = m.command.toLocaleLowerCase() as TwitchCommands;
                this.twitch.emit(command, m as ITwitchEventMap[TwitchCommands]);
            }, (error: Error, input: string) => {
                this.emit("parsing-error", { error, input });
            });
        });

        this.twitch.on("reconnect", () => {
            this.ws.reconnect();
        });

    }

    /**
     * True if a connection to twitch is open
     * and the the user is logged in.
     */
    get connected():boolean {
        return this.ws.connected && this._loggedIn;
    }

    /**
     * Sertializes and sends a message to twitch.
     * @param message The message you want to send.
     */
    send(message: IIRCMessage): void {
        const raw: string = serializeMessage(message);
        this.sendRaw(raw);
    }

    /**
     * Connects the socket and performs a login.
     * Rejects in following cases:
     *  - a socket is already open and connected
     *  - no connection to the specified twitch chat relay could be established
     *  - login fails with wrong username/token or when no confirmation (motd) is sent within 5 seconds.
     */
    async connect(): Promise<this> {
        if (this.ws.connected) {
            throw new Error("Already connected");
        }
        await this.ws.connect();
        await awaitEvent(this, "open");
        const {  pingInterval } = this.options;
        this.pingInterval = setInterval(this.ping, pingInterval);
        return this;
    }

    /**
     * disconnects from twitch
     */
    disconnect(): void {
        if (this.ws) {
            clearInterval(this.pingInterval as number);
            this.ws.close();
        }
    }

    /**
     * Sends a *raw* message through the websocket.
     *
     * @private
     * @internal
     */
    private sendRaw = (message: string) => {
        this.ws.send(message);

        this.emit("raw-send", {
            message,
            date: new Date()
        });
    }

    /**
     * Sends a ping to twitch and resolves with the delay in miliseconds.
     */
    public ping: () => Promise<number> = async () => {
        const uptime: number = (Date.now() - this.createdAt) / 1000;
        this.send({ command: "PING", params: [`${uptime}`]});
        await awaitEvent(this.twitch, "pong", 2e3, { params: ["tmi.twitch.tv", uptime.toString()] });
        const delay: number = (Date.now() - this.createdAt) / 1000 - uptime;
        this.emit("pong", delay);
        return delay;
    }

    /**
     * Joins a channel.
     * @param channel Either the lowercased name of the channel prepended with "#" or the channels id if joining a room.
     * @param room The rooms uuid required if joining a room (see https://dev.twitch.tv/docs/irc#twitch-irc-capability-chat-rooms)
     */
    async join(channel: string, room?: string): Promise<void> {
        const { auth: { username }, eventTimeout } = this.options;
        const channelID: string = room == null ? channel : `#chatrooms:${channel}:${room}`;
        this.send({ command: "JOIN", params: [channelID] });
        await awaitEvent(this.twitch, "join", eventTimeout, { params: [channelID], prefix: { kind: "user", nick: username }});
    }

    /**
     * Leaves a channel.
     * @param channel Either the lower cased channel name prepended with a # or the channel id if joining rooms.
     * @param room The rooms uuid, required if joining a room.
     */
    async part(channel: string, room?: string): Promise<void> {
        const { auth: { username }, eventTimeout } = this.options;
        const channelID: string = room == null ? channel : `#chatrooms:${channel}:${room}`;
        this.send({ command: "PART", params: [channelID] });
        await awaitEvent(this.twitch, "part", eventTimeout, { params: [channelID], prefix: { kind: "user", nick: username } });
    }
}