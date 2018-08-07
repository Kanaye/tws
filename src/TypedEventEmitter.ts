export type Listener<T> = (a: T) => any;

export interface IListenerObject<T> {
    listener: Listener<T>;
    once: boolean
}

export type ListenerMap<T> = {
    [P in keyof T]?: IListenerObject<T[P]>[];
}
// probaly very badly typed ... but ... works .. and I have no idea on how to improve it (right now)
export default class TypedEventEmitter<T> {
    private listeners: ListenerMap<T> = {};
    get hasListeners(): boolean {
        for (let key in this.listeners) {
            if ((this.listeners[key] as any[]).length > 0) return true;
        }
        return false;
    }
    hasTypesListener<K extends keyof T>(eventname: K) {
        return this.listeners[eventname] && (this.listeners[eventname] as IListenerObject<T[K]>[]).length > 0;
    }

    on<K extends keyof T>(eventname: K, listener: Listener<T[K]>, once = false):this {
        if (!this.listeners[eventname]) {
            this.listeners[eventname] = [];
        }
        (this.listeners[eventname] as IListenerObject<T[K]>[]).push({
            listener,
            once: once 
        });
        return this;
    }

    off<K extends keyof T>(eventname: K, listener: Listener<T[K]>) {
        let listeners = (this.listeners[eventname] || []) as IListenerObject<T[K]>[];
        this.listeners[eventname] = listeners.filter(l => l.listener !== listener);
    }

    once<K extends keyof T>(eventname: K, listener: Listener<T[K]>):this {
        return this.on(eventname, listener, true);
    }

    emit<K extends keyof T>(eventname: K, arg: T[K]) {
        let listeners = this.listeners[eventname];
        if (!listeners || !listeners.length) return;
        for (let i = 0; i < listeners.length; i++) {
            listeners[i].listener(arg);
        }
        this.listeners[eventname] = listeners.filter(l => !l.once)
    }
}