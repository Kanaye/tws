import IWebsocketConstructor from "./Websocket";
import SimpleEventEmitter from "./SimpleEventEmitter";

function awaitEvent(emitter: SimpleEventEmitter, eventname: string, timeout: number = null): Promise<any> {
    return new Promise((resolve ,reject) => {
        if (timeout !== null) {
            setTimeout(reject, timeout);
        }
        emitter.once(eventname, (...args: any[]) => resolve(args));
    });
}

interface IAuth {
    username: string;
    password: string;
}

interface ITwsOptions {
    auth?: IAuth;
    url?: string;
}

export default class Tws extends SimpleEventEmitter {
    static WebSocket: IWebsocketConstructor = null;

    private ws: WebSocket = null;
    private options: ITwsOptions;
    private pingInterval: Number;

    constructor(options: ITwsOptions = {}) {
        super();
        this.options = options;
    }

    get connected():boolean {
        return this.ws !== null && this.ws.readyState === Tws.WebSocket.OPEN;
    }

    async connect():Promise<void> {
        if (this.ws !== null && this.ws.readyState === Tws.WebSocket.OPEN) {
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

    private parseMessage = (e: MessageEvent) => {
        // @TODO
    }
    /**
     * Joins a channel.
     * @param channel The lowercased name of the channel prepended with "#" or the channels id
     *                You have to use the id (instead of the name) if you are joining rooms.
     * @param room The rooms uuid if you want to join a chat roo (see https://dev.twitch.tv/docs/irc#twitch-irc-capability-chat-rooms )
     */
    async join(channel: string, room?: string):Promise<void> {
        // this.ws.send(``);
    }
}