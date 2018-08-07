import SimpleEventEmitter from "./SimpleEventEmitter";

export function awaitEvent(emitter: SimpleEventEmitter, eventname: string, timeout: number = 0): Promise<any> {
    return new Promise((resolve ,reject) => {
        if (timeout > 0) {
            setTimeout(reject, timeout);
        }
        emitter.once(eventname, (arg: any) => resolve(arg));
    });
}

type key = string | number | symbol;
type keyValuePair = [key, any];

export function awaitComplexEvent(
    emitter: SimpleEventEmitter,
    eventname: string,
    eventData: Record<key, any>,
    timeout: number = 0
): Promise<any> {
    return new Promise((res, rej) => {
        const pairs: keyValuePair[] = Object.keys(eventData).map(k => ([k, eventData[k]])) as keyValuePair[];
        const listener: (a: any) => void = (a: any) => {
            for (let i: number = 0; i < pairs.length; i++) {
                const [key, value] = pairs[i];
                if (a[key] != value) {
                    return;
                }
            }
            emitter.off(eventname, listener);
            res(a);
        };
        emitter.on(eventname, listener);
        if (timeout > 0) {
            setTimeout(rej, timeout);
            emitter.off(eventname, listener);
        }
    });
}