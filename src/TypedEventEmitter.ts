export type Listener<T> = (a: T) => any;

export interface IListenerObject<T> {
    listener: Listener<T>;
    once: boolean;
}
type Listeners<T> = Array<IListenerObject<T>>;

export type ListenerMap<T> = {
    [P in keyof T]?: Listeners<T[P]>;
};

// probaly very badly typed ... but ... works .. and I have no idea on how to improve it (right now)
export default class TypedEventEmitter<T> {
    private _listeners: ListenerMap<T> = {};

    on<K extends keyof T>(eventname: K, listener: Listener<T[K]>, once: boolean = false):this {
        if (!this._listeners[eventname]) {
            this._listeners[eventname] = [];
        }
        (this._listeners[eventname] as IListenerObject<T[K]>[]).push({
            listener,
            once: once
        });
        return this;
    }

    off<K extends keyof T>(event: K, listener: Listener<T[K]>): this {
        const { _listeners: listeners } = this;
        if (listeners[event]) {
            this._listeners[event] = (listeners[event] as IListenerObject<T[K]>[]).filter(l => l.listener !== listener);
        }
        return this;
    }

    once<K extends keyof T>(eventname: K, listener: Listener<T[K]>):this {
        return this.on(eventname, listener, true);
    }

    emit<K extends keyof T>(eventname: K, arg: T[K]): this {
        const listeners: IListenerObject<T[K]>[] | undefined = this._listeners[eventname];
        if (!listeners || !listeners.length) {
            return this;
        }
        for (let i: number = 0; i < listeners.length; i++) {
            listeners[i].listener(arg);
        }
        this._listeners[eventname] = (this._listeners[eventname] as IListenerObject<T[K]>[]).filter(l => !l.once);
        return this;
    }
}