import TypedEventEmitter from "../src/TypedEventEmitter";
import { awaitEvent, contains, find, sleep } from "../src/utilities";

describe("utilites - sleep", () => {
    it("should resolve once the time is over", async () => {
        const start = Date.now();
        await sleep(100);
        const now = Date.now();
        expect(now - start).toBeGreaterThanOrEqual(70);
        expect(now - start).toBeLessThanOrEqual(150);
    });
});

describe("describe - awaitEvent", () => {
    interface ITestEvents {
        test: number;
        foo: {
            test: number[];
        };
    }

    it("should resolve when the event occurs", async () => {
        const emitter = new TypedEventEmitter<ITestEvents>();
        const listener = jest.fn();
        const r = awaitEvent(emitter, "test").then(listener);
        emitter.emit("test", 42);
        await r;
        expect(listener).toHaveBeenCalledWith(42);
    });

    it("should reject if the timeout is reached", async () => {
        const emitter = new TypedEventEmitter<ITestEvents>();
        const listener = jest.fn();
        const onerror = jest.fn();
        await awaitEvent(emitter, "test", 10)
            .then(listener)
            .catch(onerror);
        expect(listener).not.toHaveBeenCalled();
        expect(onerror).toHaveBeenCalled();
    });

    it("should resolve if the needle matches", async () => {
        const emitter = new TypedEventEmitter<ITestEvents>();
        const listener = jest.fn();
        const r = awaitEvent(emitter, "foo", undefined, { test: [42] }).then(listener);
        emitter.emit("foo", { test: [42] });
        await r;
        expect(listener).toHaveBeenCalled();
    });

    it("should not resolve if the needle doesn't matches", async () => {
        const emitter = new TypedEventEmitter<ITestEvents>();
        const listener = jest.fn();
        awaitEvent(emitter, "foo", undefined, { test: [42] }).then(listener);
        emitter.emit("foo", { test: [72] });
        await sleep(10);
        expect(listener).not.toHaveBeenCalled();
    });
});

describe("utilites - contains", () => {
    it("should return true if the string contains the needle", () => {
        expect(contains("d", "asdf")).toBe(true);
    });

    it("should return false if the string dosn't contains the neelde", () => {
        expect(contains("d", "abc")).toBe(false);
    });
});

describe("utilites - find", () => {
    it("should return the position of the character if found", () => {
        const str = "asdf";
        expect(find("d", str, 0)).toBe(2);
    });

    it("should return the next position of not the searched character", () => {
        const str = "aaaaaaaad";
        expect(find("a", str, 0, true)).toBe(8);
    });

    it("should throw if the character isn't found", () => {
        const str = "asdf";
        expect(() => {
            find("q", str, 0);
        }).toThrow();
    });
});
