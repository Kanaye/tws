import { parseMessage, parseMessages } from "../../src/irc/index";

describe("IRC - parseMessage", () => {
    function expectMessage(INPUT: string, parsed: any) {
        expect(parseMessage(INPUT)).toEqual({
            message: {
                raw: INPUT,
                ...parsed
            }
        });
    }
    it("should be able to parse messages with multiple params", () => {
        const INPUT = "TESTCOMMAND foo bar";
        expectMessage(INPUT, {
            command: "TESTCOMMAND",
            params: ["foo", "bar"],
        });
    });

    it("should be able to parse messages with a trailing param", () => {
        const INPUT ="TESTCOMMAND :foo bar blub";
        expectMessage(INPUT, {
            command: "TESTCOMMAND",
            params: ["foo bar blub"],
        });
    });

    it("should be able to parse messages with multiple params and a trailing param", () => {
        const INPUT = "TEST foo bar :some message";
        expectMessage(INPUT, {
            command: "TEST",
            params: ["foo", "bar", "some message"]
        });
    });

    it("should be able to parse messages with a server prefix", () => {
        const INPUT = ":test.some.host TEST param";
        expectMessage(INPUT, {
            command: "TEST",
            params: ["param"],
            prefix: {
                kind: "server",
                server: "test.some.host"
            }
        });
    });

    it("should be able to parse messages with an user prefix", () => {
        const INPUT = ":nick!user@test.host TEST param"
        expectMessage(INPUT, {
            command: "TEST",
            params: ["param"],
            prefix: {
                host: "test.host",
                kind: "user",
                nick: "nick",
                user: "user"
            }
        });
    });

    it("should be able to parse tags", () => {
        const INPUT = "@test=42;something=test TEST param";
        expectMessage(INPUT, {
           command: "TEST",
           params: ["param"],
            tags: { test: "42", something: "test"}
        });
    });

    it("should be able to unescape tags", () => {
        const INPUT = "@test=some\\svalue TEST param";
        expectMessage(INPUT, {
            command: "TEST",
            params: ["param"],
            tags: {
                test: "some value"
            }
        });
    });

    it("should be able to parse messages with tags, prefix and multiple params", () => {
        const INPUT = "@test=some\\svalue :nick!user@some.host TEST foo bar :some :blub"
        expectMessage(INPUT, {
            command: "TEST",
            params: ["foo", "bar", "some :blub"],
            prefix: {
                host: "some.host",
                kind: "user",
                nick: "nick",
                user: "user"
            },
            tags: {
                test: "some value"
            }
        });
    });

});