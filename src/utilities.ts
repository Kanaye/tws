import SimpleEventEmitter from "./SimpleEventEmitter";
export function awaitEvent(emitter: SimpleEventEmitter, eventname: string, timeout: number = null): Promise<any> {
    return new Promise((resolve ,reject) => {
        if (timeout !== null) {
            setTimeout(reject, timeout);
        }
        emitter.once(eventname, (...args: any[]) => resolve(args));
    });
}