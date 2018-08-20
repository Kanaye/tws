import { IIRCMessage, IParsedIRCMessage, parseMessages, serializeMessage } from "./irc/index";
import { ITwitchEventMap, TwitchCommands } from "./TwitchEvents";
import SimpleEventEmitter from "./TypedEventEmitter";
import { awaitEvent } from "./utilities";
import WebSocketManager, { IOptions as WSManagerOptions } from "./WebSocketManager";

/**
 * Login options you need to provide if you want to send chat messages.
 *
 * @public
 * @property username - The username to login with in lowercase.
 * @property password - Am oauth token for twitch with scope "chat_login". You can get one at http://www.twitchapps.com/tmi/
 */
export interface IAuth {
  username: string;
  password: string;
}

interface ICompleteTwsOptions {
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
      password: "blah", // value twitch uses for anonymous chat logins
      username: `justinfan${Math.random()
        .toFixed(6)
        .substr(-6)}` // random "justinfan" user (anonymous)
    };
  },
  get connectionOptions(): WSManagerOptions {
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

export interface IRawMessageEvent {
  message: string;
  date: Date;
}

export interface ITwsEventmap {
  "raw-send": IRawMessageEvent;
  "raw-receive": IRawMessageEvent;
  receive: IParsedIRCMessage;
  "parsing-error": {
    error: Error;
    input: string;
  };
  pong: number;
  open: null;
  close: null;
  reconnect: null;
  error: Error;
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

  // tslint:disable:variable-name
  private _loggedIn: boolean = false;
  private ws: WebSocketManager;
  private options: ICompleteTwsOptions;
  private pingInterval: number | NodeJS.Timer | undefined;
  private createdAt: number = Date.now();

  constructor(options: ITwsOptions = {}) {
    super();
    this.options = Object.assign({}, defaultSettings, options);

    const ws: WebSocketManager = (this.ws = new WebSocketManager(
      this.options.url,
      this.options.connectionOptions
    ));

    ws.on("open", async () => {
      const { auth, eventTimeout } = this.options;
      // request all Twitch IRC Capabilities
      // see https://dev.twitch.tv/docs/irc/#twitch-specific-irc-capabilities
      this.sendRaw("CAP REQ :twitch.tv/tags twitch.tv/membership twitch.tv/commands");
      try {
        await awaitEvent(this.twitch, "cap", eventTimeout);
      } catch (e) {
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
      } catch (e) {
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
      this.ws.reconnect();
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
    await awaitEvent(this, "open");
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
    await awaitEvent(this.twitch, "pong", 2e3, { params: ["tmi.twitch.tv", uptime.toString()] });
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
