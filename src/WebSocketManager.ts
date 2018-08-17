import TypedEventEmitter from "./TypedEventEmitter";
import { sleep } from "./utilities";

interface ICompleteOptions {
  reconnect: {
    auto: boolean;
    retries: number;
    delay: number;
  };
  WebSocket: typeof WebSocket;
}

export type IOptions = Partial<ICompleteOptions>;

type StaticDefaultOptions = {
  [K in Exclude<keyof ICompleteOptions, "WebSocket">]: ICompleteOptions[K]
};

const defaultOptions: StaticDefaultOptions = {
  reconnect: {
    auto: true,
    delay: 5e3,
    retries: 5
  }
};

async function createWS(url: string, WS: typeof WebSocket): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws: WebSocket = new WS(url);
    ws.onopen = () => {
      ws.onopen = null;
      ws.onerror = null;
      resolve(ws);
    };

    ws.onerror = e => {
      ws.onopen = null;
      ws.onerror = null;
      reject(e);
    };
  }) as Promise<WebSocket>;
}

interface IEventmap {
  open: null;
  reconnect: null;
  close: null;
  error: Error;
  message: string;
}

function withDefaults(options: IOptions): ICompleteOptions {
  let WS: typeof WebSocket;
  if (options.WebSocket) {
    WS = options.WebSocket;
  } else if (typeof WebSocket !== "undefined") {
    WS = WebSocket;
  } else {
    throw new Error("No global WebSocket implementation found. You need to specify one.");
  }
  const defaults: ICompleteOptions = Object.assign(defaultOptions, { WebSocket: WS });
  return Object.assign(defaults, options);
}

export default class WebSocketManager extends TypedEventEmitter<IEventmap> {
  get connected(): boolean {
    const { WebSocket } = this.options;
    return this.ws !== undefined && this.ws.readyState === WebSocket.OPEN;
  }
  options: ICompleteOptions;
  private ws: WebSocket | undefined;
  private shouldClose: boolean = false;

  constructor(private url: string, options: IOptions = {}) {
    super();
    this.options = withDefaults(options);
  }

  async connect(): Promise<this> {
    this.ws = await this._connect();
    this.emit("open", null);
    return this;
  }

  async reconnect(): Promise<this> {
    this.emit("reconnect", null);
    const ws: WebSocket = await this._connect();
    if (this.connected && this.ws) {
      this.ws.close();
    }
    this.ws = ws;
    this.emit("open", null);
    return this;
  }

  send(msg: string): void {
    if (!this.ws || !this.connected) {
      throw new Error("Not connected. You musst call connect first.");
    }
    this.ws.send(msg);
  }

  close(): void {
    this.shouldClose = true;
    if (this.ws) {
      this.ws.close();
    }
  }

  private async _connect(): Promise<WebSocket> {
    let ws: WebSocket | null = null;
    const { retries: maxRetries, delay } = this.options.reconnect;
    let i: number = 0;
    do {
      try {
        ws = await createWS(this.url, this.options.WebSocket);
        break;
      } catch (e) {
        this.emit("error", e);
      }
      await sleep(delay);
    } while(++i < maxRetries);
    if (!ws) {
      throw new Error(`Timed out connecting to ${this.url}`);
    }
    this._bindEvents(ws);
    return ws;
  }

  private _bindEvents(ws: WebSocket): void {
    ws.onclose = () => {
      if (!this.shouldClose && this.options.reconnect.auto) {
        this.reconnect().catch(e => this.emit("error", e));
      }
    };

    ws.onmessage = (e: MessageEvent) => {
      this.emit("message", e.data as string);
    };
  }
}
