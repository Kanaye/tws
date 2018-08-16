import WebSocketManager from "../src/WebSocketManager";
import WebSocketMock from "./WebSocketMock";
let ws: WebSocketManager;
describe("WebSocketManager", () => {
    beforeEach(() => {
        ws = new WebSocketManager("localhost", { WebSocket: WebSocketMock });
    });

    afterEach(() => {
        ws.close();
    })

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
        const p = ws.connect().then(success).catch(error);
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
});