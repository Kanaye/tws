import IWebsocketConstructor from "./Websocket";
import SimpleEventEmitter from "./SimpleEventEmitter";
import { parseMessages, IIRCMessage } from "./parseMessage";
import { awaitEvent, awaitComplexEvent } from "./utilities";

export { IWebsocketConstructor };

export interface IAuth {
    username: string;
    password: string;
}

export interface ITwsOptions {
    auth: IAuth;
    url: string;
    pingInterval: number;
    reconnect: boolean;
    reconnectTimeout: number;
    initTimeout: number;
}

const defaultSettings: ITwsOptions = {
    get auth(): IAuth {
        return {
            username: `justinfan${Math.random().toFixed(6).substr(-6)}`, // random "justinfan" user (anonymous)
            password: "blah" // value twitch uses for anonymous chat "logins"
        };
    },
    url: "wss://irc-ws.chat.twitch.tv/",
    pingInterval: 15e3,
    reconnect: true,
    reconnectTimeout: 30e3,
    initTimeout: 0
};

export default class Tws extends SimpleEventEmitter {
    /**
     * Used to construct the Websocket instance.
     * You can set it manually to a Websocket implementation
     * within your env if required.
     * This library ships with a version for nodejs (import tws/node) setting this
     * to uws or if uws is not available ws.
     * The browser version (tws/browser) set 's this automaticly to the WebSocket global.
     *
     * @static
     * @property {IWebsocketConstructor} WebSocket
     */
    static WebSocket: IWebsocketConstructor;

    private ws: WebSocket | undefined;
    private reconnecting: boolean = false;
    private reconnectTimer: number | undefined;
    private options: ITwsOptions;
    private pingInterval: number | NodeJS.Timer | undefined;
    public twitch: SimpleEventEmitter = new SimpleEventEmitter();
    private createdAt: number = Date.now();

    constructor(options: Partial<ITwsOptions> = {}) {
        super();
        this.options = Object.assign({}, defaultSettings, options);
    }

    get connected():boolean {
        return this.ws != null && this.ws.readyState === Tws.WebSocket.OPEN;
    }

    /**
     * Connects the socket and performs a login.
     * Rejects in following cases:
     *  - a socket is already open and connected
     *  - no connection to the specified twitch chat relay could be established
     *  - login fails with wrong username/token or when no confirmation (motd) is sent within 5 seconds.
     */
    async connect():Promise<void> {
        await this.createSocket();
        const { auth, pingInterval, initTimeout } = this.options;
        // request all Twitch IRC Capabilities
        // see https://dev.twitch.tv/docs/irc/#twitch-specific-irc-capabilities
        this.sendRaw("CAP REQ :twitch.tv/tags twitch.tv/membership twitch.tv/commands");
        await awaitEvent(this.twitch, "cap", initTimeout);

        // perform login
        this.sendRaw(`PASS ${auth.password}`);
        this.sendRaw(`NICK ${auth.username}`);
        // await first line of "motd"
        await awaitEvent(this.twitch, "001", initTimeout);

        this.pingInterval = setInterval(this.ping, pingInterval);
    }

    /**
     * Sends a *raw* message through the websocket.
     *
     * @private
     * @internal
     */
    private sendRaw = (message: string) => {
        this.connection
            .send(message);

        this.emit("raw-send", {
            message,
            time: new Date()
        });
    }

    public ping = async () => {
        const id: number = (Date.now() - this.createdAt) / 1000;
        this.sendRaw(`PING ${id}`);
        await awaitComplexEvent(this.twitch, "pong", { params: `tmi.twitch.tv :${id}` }, 2e3);
        // to await event id
    }

    /**
     * Creates a websockets and awaits the connection.
     * Rejects with possible errors emited by the websocket.
     */
    private async createSocket():Promise<void> {
         if (this.connected) {
            throw new Error("Already connected");
        }

        const { url } = this.options;
        let ws: WebSocket = this.ws = new WebSocket(url);

        ws.onmessage = this.onMessage;

        await new Promise((resolve, reject) => {
            ws.onopen = resolve;
            ws.onerror = reject;
        });
    }

    /**
     * Workaround to ensure the websocket is connected.
     * @returns {WebSocket} The connected socket.
     * @throws Error when not connected.
     */
    private get connection():WebSocket {
        if (!this.connected) {
            throw new Error("No connection to twitch. You need to call and wait for `Tws.connect()` before calling actions.");
        }
        return this.ws as WebSocket;
    }

    /**
     * Handles incomming twitch messages and triggers the events on the emitter.
     */
    private onMessage = (e: MessageEvent) => {
        const msg: string = e.data as string;
        this.emit("raw-receive", {
            date: new Date(),
            timeStamp: e.timeStamp,
            message: msg
        });

        parseMessages(msg).forEach(parsed => {
            this.emit("receive", parsed);
            if (parsed.message) {
                const message: IIRCMessage = parsed.message;
                this.twitch.emit(message.command.toLocaleLowerCase(), message);
            }
        });
    }


    /**
     * Joins a channel.
     * @param channel The lowercased name of the channel prepended with "#" or the channels id
     *                You have to use the id (instead of the name) if you are joining rooms.
     * @param room The rooms uuid if you want to join a chat roo (see https://dev.twitch.tv/docs/irc#twitch-irc-capability-chat-rooms )
     */
    async join(channel: string, room?: string):Promise<void> {
        const { username } = this.options.auth;
        if (room == null) {
            this.sendRaw(`JOIN ${channel}`);
            await awaitComplexEvent(this.twitch, "join", { params: channel, prefix: `${username}!${username}@${username}.tmi.twitch.tv`}, 2e3);
        } else {
            this.sendRaw( `JOIN #chatrooms:${channel}:${room}`);
        }

    }
}