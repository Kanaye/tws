import { IIRCMessage, IParsedIRCMessage, parseMessages, serializeMessage } from "./irc/index";
import { ITwitchEventMap, TwitchCommands } from "./TwitchEvents";
import SimpleEventEmitter from "./TypedEventEmitter";
import { awaitEvent } from "./utilities";
import WebSocketManager, { IOptions as WSManagerOptions } from "./WebSocketManager";

/**
 * Login options you need to provide if you want to send chat messages.
 *
 * @public
 */
export interface IAuth {
   /**
    * The username to login with in lowercase.
    */
    username: string;
    /**
     * Am oauth token for twitch with scope "chat_login". You can get one at http://www.twitchapps.com/tmi/
     */
    password: string;
}

interface ICompleteTwsOptions {
  /**
   * The auth credentials to use for login.
   * Defaults to an anonymous login.
   */
    auth: IAuth;
    /**
     * The url including protocol to connect to.
     * Defaults to wss://irc-ws.chat.twitch.tv/ 
     */
    url: string;
    /**
     * The interval in which we will try to ping twich
     * in milliseconds.
     * Defaults to 5000.
     */
    pingInterval: number;
    connection: WSManagerOptions;
    /**
     * The time to wait before throwing when 
     * waiting for  
     */
    eventTimeout: number;
}

export type ITwsOptions = Partial<ICompleteTwsOptions>;

const defaultSettings: ICompleteTwsOptions = {
    get auth(): IAuth {
        return {
            password: "blah", // value twitch uses for anonymous chat logins
            username: `justinfan${Math.random()
                .toFixed(6)
                .substr(-6)}` // random "justinfan" user (anonymous)
        };
    },
    get connection(): WSManagerOptions {
        return {
            reconnect: {
                auto: true,
                delay: 5e3,
                retries: 5
            }
        };
    },
    eventTimeout: 3e3,
    pingInterval: 15e3,
    url: "wss://irc-ws.chat.twitch.tv/"
};
/**
 * A raw message with the serialized message and the recerive/send date.
 */
export interface IRawMessageEvent {
    /**
     * The raw, serialized IRC Message.
     */
    message: string;
    /**
     * The datetime the message has been received or send.
     */
    date: Date;
}

export interface ITwsEventmap {
    /**
     * Emitted when a serialized message is sent.
     */
    "raw-send": IRawMessageEvent;
    /**
     * Emitted when a message got received.
     */
    "raw-receive": IRawMessageEvent;
    /**
     * Emitted when a message got received and parsed. 
     */
    receive: IParsedIRCMessage;
    /**
     * Emitted when ever a received IRC Message could not be parsed.
     */
    "parsing-error": {
        /**
         * The error why the message couldn't be parsed.
         */
        error: Error;
        /**
         * The input that couldn't be parsed.
         */
        input: string;
    };
    /**
     * Emitted when a pong is received from twitch.
     * The value is the delay/lag in milliseconds.
     */
    pong: number;
    /**
     * Emitted when a new connection to twitch got opened.
     */
    open: null;
    /**
     * Emitted when a connection got closed.
     */
    close: null;
    /**
     * Emitted when a new connection will be opened.
     * Either because the connection just closed or
     * because twitch send a "reconnect" command.
     */
    reconnect: null;
    /**
     * Emitted when an error occured in processing.
     */
    error: Error;
}

/**
 * Requests given capabilities.
 * @internal
 */
async function requestCapabilities(
    capabilities: string[],
    tws: Tws,
    timeout: number
): Promise<void> {
    tws.send({
        command: "CAP",
        params: ["REQ", capabilities.join(" ")]
    });

    const acknowleged: string[] = [];
    while (acknowleged.length < capabilities.length) {
        const msg = await awaitEvent(tws.twitch, "cap", timeout).catch(() => {
            const missing = capabilities.filter(c => acknowleged.indexOf(c) === -1);
            throw new Error(`Timed out requesting capabilities "${missing.join(", ")}".`);
        });

        const [_, ack, caps] = msg.params;

        if (ack === "NAK") {
            throw new Error(`Twitch denied capabilities "${caps.split(" ").join(", ")}".`);
        }

        caps.split(" ").forEach(c => acknowleged.push(c));
    }
}
/**
 * Performs the login sequence on the websocket.
 * @internal
 */
async function performLogin(
  auth: IAuth,
  tws: Tws,
  timeout: number
): Promise<void> {
  tws.send({
    command: "PASS",
    params: [auth.password]
  });

  tws.send({
    command: "NICK",
    params: [auth.username]
  });

  const res = await new Promise((r, e) => {
    awaitEvent(tws.twitch, "001", timeout).then(m => r(m)).catch(e);
    awaitEvent(tws.twitch, "notice").then(m => r(m)); 
  }) as ITwitchEventMap["001"] | ITwitchEventMap["notice"];

  if (res.command === "NOTICE") {
    throw new Error(`Could not login! Error: ${res.params[1]}`);
  }
}

/**
 * @internal
 */
interface IVoidResolve {
    resolve: () => any;
    reject: (e: Error) => any;
    promise: Promise<any>;
}
/**
 * @internal
 */
function connectionResolveable(tws: Tws): Promise<void> {
  // tslint:disable:no-string-literal
  if (!tws["_connectPromise"]) {
    const result: Partial<IVoidResolve> = {};
    const remove = () => {
      if (tws["_connectPromise"] === result) {
        tws["_connectPromise"] = null;
      }
    };
    result.promise = new Promise((resolve, reject) => {
      result.reject = (e: Error) => { remove(); reject(e) };
      result.resolve = () => { remove(); resolve() };
    });
    tws["_connectPromise"] = result as IVoidResolve;
  }
  // tslint:disable:no-string-literal
  // @ts-ignore typescript is currently to dumb to realize this case will never exist
  return tws["_connectPromise"].promise;
}
/**
 * Tws handles websocket connection, reconnects,
 * serialization and sending of messages,
 * parsing of incomming messages and dispatches events for them.
 */
export default class Tws extends SimpleEventEmitter<ITwsEventmap> {
    /**
     * True if a connection to twitch is open
     * and the the user is logged in.
     */
    get connected(): boolean {
        return this.ws.connected && this._loggedIn;
    }

    /**
     * The event emitter on which all received irc messages are dispatched on.
     */
    public twitch: SimpleEventEmitter<ITwitchEventMap> = new SimpleEventEmitter();
    /**
     * twitch capabilities to request when connecting
     * you can change them if you need to ...
     * but note that you *must* do it *before* connecting
     * changing it while beeing connected will *not* change
     * current capibilities!
     *
     * defaults to all (currently) know capabilities supported by twitch.
     * @see https://dev.twitch.tv/docs/irc/guide/#twitch-irc-capabilities
     */
    public capabilities: string[] = [
        "twitch.tv/tags",
        "twitch.tv/membership",
        "twitch.tv/commands"
    ];

    // tslint:disable:variable-name
    private _loggedIn: boolean = false;
    private _connectPromise: IVoidResolve | null = null;
    private ws: WebSocketManager;
    private options: ICompleteTwsOptions;
    private pingInterval: number | NodeJS.Timer | undefined;
    private createdAt: number = Date.now();

    constructor(options: ITwsOptions = {}) {
        super();
        this.options = Object.assign({}, defaultSettings, options);

        const ws: WebSocketManager = (this.ws = new WebSocketManager(
            this.options.url,
            this.options.connection
        ));

        ws.on("open", async () => {
            const { auth, eventTimeout } = this.options;
            try {
              // request capabilities for this instance
              await requestCapabilities(this.capabilities, this, eventTimeout);
              // send login
              await performLogin(auth, this, eventTimeout);
              this._loggedIn = true;
              this.emit("open", null);
              if (this._connectPromise) {
                  this._connectPromise.resolve();
              }
            } catch (e) {
                if (this._connectPromise) {
                    this._connectPromise.reject(e);
                    this._connectPromise = null;
                } else {
                    this.emit("error", e);
                }
                this.ws.close();
                return;
            }
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

            parseMessages(
                msg,
                (m: IParsedIRCMessage) => {
                    this.emit("receive", m);
                    const command: TwitchCommands = m.command.toLocaleLowerCase() as TwitchCommands;
                    this.twitch.emit(command, m as ITwitchEventMap[TwitchCommands]);
                },
                (error: Error, input: string) => {
                    this.emit("parsing-error", { error, input });
                }
            );
        });

        this.twitch.on("reconnect", () => {
            this.ws.reconnect().catch(e => this.emit("error", e));
        });

        this.twitch.on("ping", m => {
            this.send({
                command: "PONG",
                params: m.params
            });
        });
    }

    /**
     * Sertializes and sends a message to twitch.
     * @param message - The message you want to send.
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
        await connectionResolveable(this); 
        const { pingInterval } = this.options;
        this.pingInterval = setInterval(this.ping, pingInterval);
        return this;
    }

    /**
     * Disconnects from twitchs WebIRC Gateway.
     */
    disconnect(): void {
        if (this.ws.connected) {
            this.ws.close();
        }
        if (this.pingInterval) {
            clearInterval(this.pingInterval as number);
            this.pingInterval = undefined;
        }
    }

    /**
     * Sends a ping to twitch and resolves with the delay in miliseconds.
     */
    ping: () => Promise<number> = async () => {
        const uptime: number = (Date.now() - this.createdAt) / 1000;
        this.send({ command: "PING", params: [`${uptime}`] });
        await awaitEvent(this.twitch, "pong", this.options.eventTimeout, {
            params: ["tmi.twitch.tv", uptime.toString()]
        });
        const delay: number = (Date.now() - this.createdAt) / 1000 - uptime;
        this.emit("pong", delay);
        return delay;
    };

    /**
     * Sends a *raw* message through the websocket.
     *
     * @private
     * @internal
     */
    private sendRaw = (message: string) => {
        this.ws.send(message);

        this.emit("raw-send", {
            date: new Date(),
            message
        });
    };
}
