import IWebsocketConstructor from "./Websocket";
import SimpleEventEmitter from "./SimpleEventEmitter";
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
    static WebSocket: IWebsocketConstructor;

    private ws: WebSocket | undefined;
    private options: ITwsOptions;
    private pingInterval: Number | undefined;

    constructor(options: ITwsOptions = {}) {
        super();
        this.options = options;
    }

    get connected():boolean {
        return this.ws != null && this.ws.readyState === Tws.WebSocket.OPEN;
    }

    async connect():Promise<void> {
        if (this.connected) {
            throw new Error("Already connected");
        }

        let url: string = this.options.url || "wss://irc-ws.chat.twitch.tv/";
        let ws: WebSocket = this.ws = new WebSocket(url);

        ws.onmessage = this.parseMessage;

        await new Promise((resolve, reject) => {
            ws.onopen = resolve;
            ws.onerror = reject;
        });

        // request *all* Twitch IRC Capabilities
        // see https://dev.twitch.tv/docs/irc/#twitch-specific-irc-capabilities
        ws.send("CAP REQ :twitch.tv/tags twitch.tv/membership twitch.tv/commands");

        let auth: IAuth = this.options.auth || {
            username: `justinfan${Math.random().toFixed(6).substr(-6)}`, // random "justinfan" user (anonymous)
            password: "blah" // value twitch uses for anonymous chat "logins"
        };
        // perform login
        ws.send(`PASS ${auth.password}`);
        ws.send(`NICK ${auth.username}`);

    }

    /**
     * Workaround 
     * @returns WebSocket
     * @throws Error when not connected.
     */
    private ensureConnected():WebSocket {
        // Unfortunatly TypeScript is not "smart enough" to know that "this.connected" is checking for "!this.ws"
        if (!this.connected || !this.ws) {
            throw new Error('No connection to twitch. You need to call and wait for `Tws.connect()` before calling actions.');
        }
        return this.ws;
    }

    private parseMessage = (e: MessageEvent) => {
        // @TODO
        const msg = e.data as string;
    }
    /**
     * Joins a channel.
     * @param channel The lowercased name of the channel prepended with "#" or the channels id
     *                You have to use the id (instead of the name) if you are joining rooms.
     * @param room The rooms uuid if you want to join a chat roo (see https://dev.twitch.tv/docs/irc#twitch-irc-capability-chat-rooms )
     */
    async join(channel: string, room?: string):Promise<void> {
        const ws = this.ensureConnected();
        let action: string;
        if (room == null) {
            action = `JOIN ${channel}`;
        } else {
            action = `JOIN #chatrooms:${channel}:${room}`;
        }
        ws.send(action);
    }
}