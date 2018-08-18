import { serializeMessage } from "../../src/irc/index";

describe("irc - serialization", () => {
  it("should be able to serialize a message with one param", () => {
    const msg = serializeMessage({
      command: "TEST",
      params: ["blub"]
    });
    expect(msg).toBe("TEST blub");
  });

  it("should be able to serialize multi param messages", () => {
    const msg = serializeMessage({
      command: "TEST",
      params: ["param1", "param2", "param3"]
    });
    expect(msg).toBe("TEST param1 param2 param3");
  });

  it("should be able to serialize if the last param contains a space", () => {
    expect(
      serializeMessage({
        command: "TEST",
        params: ["test", "some test"]
      })
    ).toBe("TEST test :some test");

    expect(
      serializeMessage({
        command: "TEST",
        params: ["some test"]
      })
    ).toBe("TEST :some test");
  });

  it("should throw if an other param contains a space", () => {
    expect(() => {
      serializeMessage({
        command: "TEST",
        params: ["test test", "42"]
      });
    }).toThrow("Only the last message parameter can contain spaces.");
  });

  it("should throw if a param contains new lines", () => {
    expect(() => {
      serializeMessage({
        command: "TEST",
        params: ["test\n"]
      });
    }).toThrow("Messages can not contain new lines (\\n).");
  });

  it("should throw if a param contains new lines", () => {
    expect(() => {
      serializeMessage({
        command: "TEST",
        params: ["test\r"]
      });
    }).toThrow("Messages can not contain carriage returns (\\r).");
  });

  it('should throw if a param startsWith ":"', () => {
    expect(() => {
      serializeMessage({
        command: "TEST",
        params: [":"]
      });
    }).toThrow(`Message parameters can not start with ":".`);
  });
});
