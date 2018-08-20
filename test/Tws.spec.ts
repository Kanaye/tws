import Tws from "../src/index";
import WSM from "./WebSocketMock";

function emulateLogin(ws: WSM): Promise<void> {
    let i = 0;
    return new Promise((r) => {
        ws.mock.emitter.on("send", () => {
            if (i === 0) {
               ws.mock.send(`:tmi.twitch.tv CAP * ACK :twitch.tv/tags twitch.tv/membership twitch.tv/commands`); 
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
    jest.setTimeout(10e3)
    let tws: Tws;
    beforeEach(() => {
        tws = new Tws({
            connectionOptions: {
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
            ws.mock.emitter.on('send', (m) => {
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
        tws = new Tws({ auth: { password: "test", username: "test" }, connectionOptions: { WebSocket: WSM }});
        WSM.nextInstance.then(ws => {
            let count = 0;
            ws.mock.emitter.on('send', (m) => {
                expect(m).toMatch(messages[count++]);
            });
            return emulateLogin(ws);
        });
        await tws.connect();
    });

    it("should emit raw-receive when it receives a message", async () => {
        WSM.nextInstance.then(i => { emulateLogin(i); return i; });
        await tws.connect();
        const ws = WSM.lastInstance;
        tws.on("raw-receive", (e) => {
            expect(e.message).toBe(":some.host TEST test");
        });
        ws.mock.send(":some.host TEST test");
    });
});

