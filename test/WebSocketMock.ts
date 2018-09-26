import TypedEventEmitter from "../src/TypedEventEmitter";

type ReadyStates =
    | WebSocketMock["CONNECTING"]
    | WebSocketMock["OPEN"]
    | WebSocketMock["CLOSING"]
    | WebSocketMock["CLOSED"];
type IResolveable = (value: WebSocketMock) => any;
let lastInstance: WebSocketMock;
const promises: IResolveable[] = [];
// tslint:disable:no-empty
const noop = () => {};
const onmessage = Symbol("onmessage");
const onclose = Symbol("onclose");
const onerror = Symbol("onerror");
const onopen = Symbol("onopen");

type MessageHandler = (ev?: MessageEvent) => any;
type CloseHandler = (ev?: CloseEvent) => any;
type OpenHandler = (ev?: Event) => any;
type ErrorHandler = (ev?: Event) => any;

interface IWSEvents {
    send: string;
    close: null;
}

function createMockObject(mock: WebSocketMock) {
    return (() => {
        const self = mock;
        return {
            emitter: new TypedEventEmitter<IWSEvents>(),
            messages: [] as string[],
            send(msg: string) {
                setTimeout(() => {
                    const m = new MessageEvent("send", { data: msg });
                    self.onmessage(m);
                }, 10);
            }
        };
    })();
}

export default class WebSocketMock implements WebSocket {
    static readonly CONNECTING: number = 0;
    static readonly OPEN: number = 1;
    static readonly CLOSING: number = 2;
    static readonly CLOSED: number = 3;

    static get lastInstance(): WebSocketMock {
        return lastInstance;
    }

    static set lastInstance(instance: WebSocketMock) {
        lastInstance = instance;
        let r;
        // tslint:disable:no-conditional-assignment
        while ((r = promises.pop()) != null) {
            r(instance);
        }
    }

    static get nextInstance(): Promise<WebSocketMock> {
        return new Promise(r => {
            promises.push((wsm: WebSocketMock) => r(wsm));
        });
    }

    static async autoOpenNext() {
        const mock = await WebSocketMock.nextInstance;
        mock.onopen();
    }

    readonly CONNECTING: number = 0;
    readonly OPEN: number = 1;
    readonly CLOSING: number = 2;
    readonly CLOSED: number = 3;

    get binaryType(): "blob" | "arraybuffer" {
        return "blob";
    }

    get bufferedAmount(): number {
        return 42;
    }

    get extensions(): string {
        return "";
    }

    get protocol(): string {
        return "";
    }

    url: string;
    [onmessage]: MessageHandler | null = null;
    [onerror]: ErrorHandler | null = null;
    [onopen]: OpenHandler | null = null;
    [onclose]: CloseHandler | null = null;
    set onmessage(h: MessageHandler) {
        this[onmessage] = h;
    }
    get onmessage(): MessageHandler {
        return this[onmessage] || noop;
    }

    set onclose(h: CloseHandler) {
        this[onclose] = h;
    }

    get onclose(): CloseHandler {
        return this[onclose] || noop;
    }

    set onerror(h: ErrorHandler) {
        this[onerror] = h;
    }

    get onerror(): ErrorHandler {
        return this[onerror] || noop;
    }

    set onopen(h: OpenHandler) {
        this[onopen] = h;
    }

    get onopen(): OpenHandler {
        return () => {
            this.iReadyState = WebSocketMock.OPEN;
            return (this[onopen] || noop)();
        };
    }

    get readyState(): ReadyStates {
        return this.iReadyState;
    }

    mock = createMockObject(this);

    private iReadyState: ReadyStates = 0;

    constructor(url: string, protocols?: string | string[]) {
        this.url = url;
        WebSocketMock.lastInstance = this;
        this.iReadyState = WebSocketMock.CONNECTING;
    }

    close(code?: number, reason?: string) {
        this.iReadyState = WebSocketMock.CLOSED;
        this.mock.emitter.emit("close", null);
        this.iReadyState = WebSocketMock.CLOSING;
        setTimeout(() => (this.iReadyState = WebSocketMock.CLOSED), 10);
    }

    send(data: string | ArrayBuffer | ArrayBufferView | Blob) {
        this.mock.messages.push(String(data));
        this.mock.emitter.emit("send", data.toString());
    }

    addEventListener(...args: any[]) {
        throw new Error("Not implemented!");
    }
    removeEventListener(...args: any[]) {
        throw new Error("Not implemented!");
    }
    dispatchEvent(...args: any[]): boolean {
        throw new Error("Not implemented!");
    }
}
