import Tws from "../src/index";
import { awaitEvent } from "../src/utilities";
import WSM from "./WebSocketMock";

function emulateLogin(ws: WSM): Promise<void> {
    let i = 0;
    return new Promise(r => {
        ws.mock.emitter.on("send", () => {
            if (i === 0) {
                ws.mock.send(
                    `:tmi.twitch.tv CAP * ACK :twitch.tv/tags twitch.tv/membership twitch.tv/commands`
                );
            }
            if (i === 1) {
                ws.mock.send(`:tmi.twitch.tv 001 user: Welcome!`);
            }
            if (i === 2) {
                r();
            }
            i++;
        });
        ws.onopen();
    });
}

describe("Tws", () => {
    jest.setTimeout(10e3);
    let tws: Tws;
    beforeEach(() => {
        tws = new Tws({
            connection: {
                WebSocket: WSM
            },
            eventTimeout: 100
        });
    });

    afterEach(() => {
        tws.disconnect();
    });

    it("should request capabilities and try to login with a random user when connecting", async () => {
        const messages = [
            /CAP REQ :twitch\.tv\/tags twitch\.tv\/membership twitch\.tv\/commands/,
            /PASS blah/,
            /NICK justinfan\d{6}/
        ];
        WSM.nextInstance.then(ws => {
            let count = 0;
            ws.mock.emitter.on("send", m => {
                expect(m).toMatch(messages[count++]);
            });
            emulateLogin(ws);
        });
        await tws.connect();
    });

    it("should pass the configured username and password", async () => {
        const messages = [
            /CAP REQ :twitch\.tv\/tags twitch\.tv\/membership twitch\.tv\/commands/,
            /PASS test/,
            /NICK test/
        ];
        tws = new Tws({
            auth: { password: "test", username: "test" },
            connection: { WebSocket: WSM }
        });
        WSM.nextInstance.then(ws => {
            let count = 0;
            ws.mock.emitter.on("send", m => {
                expect(m).toMatch(messages[count++]);
            });
            return emulateLogin(ws);
        });
        await tws.connect();
    });

    it("should emit raw-receive when it receives a message", async () => {
        WSM.nextInstance.then(i => emulateLogin(i));
        await tws.connect();
        const ws = WSM.lastInstance;
        tws.on("raw-receive", e => {
            expect(e.message).toBe(":some.host TEST test");
        });
        ws.mock.send(":some.host TEST test");
    });

    it("emits parsed messages at receive", async () => {
        WSM.nextInstance.then(i => emulateLogin(i));
        await tws.connect();
        const ws = WSM.lastInstance;
        const INPUT = ":some.host TEST test";
        tws.on("receive", m => {
            expect(m).toEqual({
                command: "TEST",
                params: ["test"],
                prefix: {
                    kind: "server",
                    server: "some.host"
                },
                raw: INPUT
            });
        });
        ws.mock.send(INPUT);
    });

    it("emits messages on the .twitch emitter", async () => {
        WSM.nextInstance.then(i => emulateLogin(i));
        await tws.connect();
        const input = ":some.host PONG test";
        tws.twitch.on("pong", m => {
            expect(m).toEqual({
                command: "PONG",
                params: ["test"],
                prefix: {
                    kind: "server",
                    server: "some.host"
                },
                raw: input
            });
        });
        WSM.lastInstance.mock.send(input);
    });

    it("sends pings in the specified interval", async () => {
        tws = new Tws({ pingInterval: 100, connection: { WebSocket: WSM } });
        WSM.nextInstance.then(i => emulateLogin(i));
        await tws.connect();
        await new Promise(r => {
            WSM.lastInstance.mock.emitter.on("send", m => {
                expect(m).toMatch(/PING \d+/);
                r();
            });
        });
    });

    it("emits pong events with the delay as a param", async () => {
        tws = new Tws({ pingInterval: 100, connection: { WebSocket: WSM } });
        WSM.nextInstance.then(i => emulateLogin(i));
        await tws.connect();
        const delay = awaitEvent(tws, "pong", 3000);
        await new Promise(r => {
            WSM.lastInstance.mock.emitter.on("send", msg => {
                if (msg.indexOf("PING") > -1) {
                    WSM.lastInstance.mock.send(msg.replace("PING", "PONG tmi.twitch.tv"));
                    r();
                }
            });
        });
        expect(await delay).toBeGreaterThanOrEqual(0);
    });

    it("auto answers ping messages with pong", async () => {
        WSM.nextInstance.then(i => emulateLogin(i));
        await tws.connect();
        const ws = WSM.lastInstance;
        const listener = jest.fn();
        ws.mock.emitter.on("send", listener);
        ws.mock.send("PING 42");
        await new Promise(r => ws.mock.emitter.once("send", () => r()));
        expect(listener).toHaveBeenCalledWith("PONG 42");
    });
});
