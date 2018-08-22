import WebSocketManager from "../src/WebSocketManager";
import WebSocketMock from "./WebSocketMock";
let ws: WebSocketManager;
describe("WebSocketManager", () => {
    jest.setTimeout(10e3);
    beforeEach(() => {
        ws = new WebSocketManager("localhost", {
            WebSocket: WebSocketMock,
            reconnect: { delay: 0, auto: true, retries: 3 }
        });
    });

    afterEach(() => {
        ws.close();
    });

    it("should use the specified WebSocket implentation", async () => {
        expect(ws.options.WebSocket).toBe(WebSocketMock);
        // tslint:disable:no-string-literal
        const p = ws.connect();
        (WebSocketMock.lastInstance.onopen as () => {})();
        await p;
        expect(ws["ws"]).toBeInstanceOf(WebSocketMock);
    });

    it("should resolve after the socket connected", async () => {
        const success = jest.fn();
        const error = jest.fn();
        const p = ws
            .connect()
            .then(success)
            .catch(error);
        const wsm = WebSocketMock.lastInstance;
        expect(success).not.toHaveBeenCalled();
        expect(error).not.toHaveBeenCalled();
        if (wsm.onopen == null) {
            throw new Error("WebSocket.onopen is null");
        }
        wsm.onopen();
        await p;
        expect(success).toHaveBeenCalled();
    });

    it("should only reject after options.reconnect.retries is reached", async () => {
        const success = jest.fn();
        const error = jest.fn();
        const r = ws
            .connect()
            .then(success)
            .catch(error);
        let wsm: WebSocketMock | null = null;
        for (let i = 0; i < ws.options.reconnect.retries; i++) {
            if (!wsm) {
                wsm = WebSocketMock.lastInstance;
            } else {
                wsm = await WebSocketMock.nextInstance;
            }
            expect(success).not.toHaveBeenCalled();
            expect(error).not.toHaveBeenCalled();
            wsm.onerror();
        }
        await r;
        expect(success).not.toHaveBeenCalled();
        expect(error).toHaveBeenCalled();
    });

    it("should autoreconnect if the socket closes", async () => {
        const onreconnect = jest.fn();
        WebSocketMock.autoOpenNext();
        ws.on("reconnect", onreconnect);
        await ws.connect();
        const opened = new Promise(r => {
            ws.on("open", () => r());
        });
        const first = WebSocketMock.lastInstance;
        WebSocketMock.autoOpenNext();
        first.onclose();
        await opened;
        expect(first).not.toBe(WebSocketMock.lastInstance);
        expect(onreconnect).toHaveBeenCalled();
    });

    it("should emit connection errors to the handler", async () => {
        const onerror = jest.fn();
        ws = new WebSocketManager("localhost", {
            WebSocket: WebSocketMock,
            reconnect: { delay: 0, retries: 1, auto: true }
        });
        const r = WebSocketMock.nextInstance;
        ws.on("error", onerror);
        const oncatch = jest.fn();
        const p = ws.connect().catch(oncatch);
        (await r).onerror();
        await p;
        expect(onerror).toHaveBeenCalled();
        expect(oncatch).toHaveBeenCalled();
    });

    it("should emit messages", async () => {
        const onmessage = jest.fn();
        ws.on("message", onmessage);
        WebSocketMock.autoOpenNext();
        await ws.connect();
        const ms = new MessageEvent("test", { data: "test" });
        (WebSocketMock.lastInstance.onmessage as (ms: MessageEvent) => {})(ms);
        expect(onmessage).toHaveBeenCalledWith("test");
    });

    it("should emit messages after an reconnect", async () => {
        const onmessage = jest.fn();
        ws.on("message", onmessage);
        WebSocketMock.autoOpenNext();
        await ws.connect();
        WebSocketMock.lastInstance.onmessage(new MessageEvent("test", { data: "test" }));
        WebSocketMock.autoOpenNext();
        await ws.reconnect();
        WebSocketMock.lastInstance.onmessage(new MessageEvent("test", { data: "test2" }));
        expect(onmessage.mock.calls).toEqual([["test"], ["test2"]]);
    });

    it("should pass messages to the underlying websocket", async () => {
        WebSocketMock.autoOpenNext();
        await ws.connect();
        ws.send("test");
        ws.send("something");
        ws.send("test 42");
        expect(WebSocketMock.lastInstance.mock.messages).toEqual(["test", "something", "test 42"]);
    });

    it("should pass messages to the correct socket after a reconnect", async () => {
        WebSocketMock.autoOpenNext();
        await ws.connect();
        const first = WebSocketMock.lastInstance;
        ws.send("test");
        WebSocketMock.autoOpenNext();
        await ws.reconnect();
        ws.send("42");
        expect(first.mock.messages).toEqual(["test"]);
        expect(WebSocketMock.lastInstance.mock.messages).toEqual(["42"]);
    });
});
