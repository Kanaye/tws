import IWebsocketConstructor from "./Websocket";
import SimpleEventEmitter from "./SimpleEventEmitter";
import { parseMessages } from "./parseMessage";
import { awaitEvent } from "./utilities";

export { IWebsocketConstructor };

export interface IAuth {
    username: string;
    password: string;
}

export interface ITwsOptions {
    auth?: IAuth;
    url?: string;
}

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
    private options: ITwsOptions;
    private pingInterval: number | undefined;
    public twitch: SimpleEventEmitter = new SimpleEventEmitter();

    constructor(options: ITwsOptions = {}) {
        super();
        this.options = options;
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

        // request *all* Twitch IRC Capabilities
        // see https://dev.twitch.tv/docs/irc/#twitch-specific-irc-capabilities
        this.sendRaw("CAP REQ :twitch.tv/tags twitch.tv/membership twitch.tv/commands");

        let auth: IAuth = this.options.auth || {
            username: `justinfan${Math.random().toFixed(6).substr(-6)}`, // random "justinfan" user (anonymous)
            password: "blah" // value twitch uses for anonymous chat "logins"
        };

        // perform login
        this.sendRaw(`PASS ${auth.password}`);
        this.sendRaw(`NICK ${auth.username}`);

    }

    /**
     * Sends a *raw* message through the websocket.
     *
     * @private
     * @internal
     */
    private sendRaw = (message: string) => {
        this.ensureConnected()
            .send(message);

        this.emit("raw-send", {
            message,
            time: new Date()
        });
    }

    /**
     * Creates a websockets and awaits the connection.
     * Rejects with possible errors emited by the websocket.
     */
    private async createSocket():Promise<void> {
         if (this.connected) {
            throw new Error("Already connected");
        }

        let url: string = this.options.url || "wss://irc-ws.chat.twitch.tv/";
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
    private ensureConnected():WebSocket {
        if (!this.connected) {
            throw new Error("No connection to twitch. You need to call and wait for `Tws.connect()` before calling actions.");
        }
        return this.ws;
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
        });
    }


    /**
     * Joins a channel.
     * @param channel The lowercased name of the channel prepended with "#" or the channels id
     *                You have to use the id (instead of the name) if you are joining rooms.
     * @param room The rooms uuid if you want to join a chat roo (see https://dev.twitch.tv/docs/irc#twitch-irc-capability-chat-rooms )
     */
    async join(channel: string, room?: string):Promise<void> {
        let action: string;
        if (room == null) {
            action = `JOIN ${channel}`;
        } else {
            action = `JOIN #chatrooms:${channel}:${room}`;
        }
        this.sendRaw(action);
    }
}