import TypedEventEmitter from "../src/TypedEventEmitter";

interface ITest {
    "test": number,
    "foo": string[]
}
// tslint:disable:no-empty
const noop = () => {};

describe("TypedEventEmitter", () => {
    it("should stora a listner in on()", () => {
        const E = new TypedEventEmitter<ITest>();
        // tslint:disable:no-string-literal
        expect(E["_listeners"]).toEqual({});
        E.on("test", noop);
        expect(E["_listeners"]).toEqual({
            test: [{
                listener: noop,
                once: false
            }]
        });
    });

    it("should remove a listner when called off()", () => {
        const E = new TypedEventEmitter<ITest>();
        // tslint:disable:no-string-literal
        E.on("test", noop);
        expect(E["_listeners"]).toEqual({
            test: [{
                listener: noop,
                once: false
            }]
        });
        E.off("test", noop);
        expect(E["_listeners"]).toEqual({
            test: []
        });
    });

    it("should call a listener with it's value", () => {
        const E = new TypedEventEmitter<ITest>();
        // tslint:disable:no-string-literal
        const listener = jest.fn();
        E.on("test", listener);
        E.emit("test", 42);
        expect(listener.mock.calls[0][0]).toBe(42);
    });

    it("shoudn't throw if there are no listeners when an event is emitted", () => {
        const E = new TypedEventEmitter<ITest>();
        expect(() => E.emit("test", 42)).not.toThrow();
    });

    it("should remove a listener attached with once after it 's called", () => {
        const E = new TypedEventEmitter<ITest>();
        const listener = jest.fn();
        E.once("test", listener);
        expect(E["_listeners"]).toEqual({
            test: [{
                listener,
                once: true
            }]
        });
        E.emit("test", 42);
        expect(listener.mock.calls[0][0]).toBe(42);
        expect(E["_listeners"]).toEqual({
            test: []
        });
        E.emit("test", 42);
        expect(listener.mock.calls).toHaveLength(1);
    });

    it("should call listeners mutiple time", () => {
        const E = new TypedEventEmitter<ITest>();
        const listener = jest.fn();
        E.on("test", listener);
        E.emit("test", 42);
        E.emit("test", 0);
        expect(listener.mock.calls).toHaveLength(2);
        expect(listener.mock.calls[0][0]).toBe(42);
        expect(listener.mock.calls[1][0]).toBe(0);
    });
});