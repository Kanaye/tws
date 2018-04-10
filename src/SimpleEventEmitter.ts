export type Listener = (...args: any[]) => void;

interface IListenerObject {
    listener: Listener;
    once: boolean;
}

export default class SimpleEventEmitter {
    private listeners:Record<string, IListenerObject[]> = {};
    on(eventname: string, listener: Listener, once = false):SimpleEventEmitter {
        this.listeners[eventname] = this.listeners[eventname] || [];
        this.listeners[eventname].push({
            listener,
            once: once 
        });
        return this;
    }

    off(eventname: string, listener: Listener) {
        let listeners = this.listeners[eventname] || [];
        this.listeners[eventname] = listeners.filter(l => l.listener !== listener);
    }

    once(eventname: string, listener: Listener): SimpleEventEmitter {
        return this.on(eventname, listener, true);
    }

    emit(eventname: string, ...args: any[]) {
        let listeners = this.listeners[eventname] || [];
        for (let i = 0; i < listeners.length; i++) {
            listeners[i].listener(...args);
            if (listeners[i].once) {
                listeners.splice(i, 1);
                i--;
            }
        }
    }
}