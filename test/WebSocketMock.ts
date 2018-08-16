type ReadyStates = WebSocketMock["CONNECTING"] | WebSocketMock["OPEN"] | WebSocketMock["CLOSING"] | WebSocketMock["CLOSED"];

export default class WebSocketMock implements WebSocket {
    static lastInstance: WebSocketMock;
    static readonly CONNECTING: number = 0;
    static readonly OPEN: number = 1;
    static readonly CLOSING: number = 2;
    static readonly CLOSED: number = 3;
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
    onmessage: null | ((ev?: MessageEvent) => any) = null;
    onclose: null | ((ev?: CloseEvent) => any) = null;
    onerror: null | ((ev?: Event) => any) = null;
    onopen: null | ((ev?: Event) => any) = null;

    get readyState(): ReadyStates {
        return this.iReadyState;
    }

    mockMessages: string[] = [];
    private iReadyState: ReadyStates = 0;

    constructor(url: string, protocols?: string | string[]) {
        this.url = url;
        WebSocketMock.lastInstance = this;
    }

    close(code?: number, reason?: string) {
        this.iReadyState = WebSocketMock.CLOSED;
    }

    send(data: string | ArrayBuffer | ArrayBufferView | Blob) {
        this.mockMessages.push(data.toString());
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