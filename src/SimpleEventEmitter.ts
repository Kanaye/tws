export default class SimpleEventEmitter {
    private listeners = {};
    on(eventname: string, listener: Function, once = false):void {
        this.listeners[eventname] = this.listeners[eventname] || [];
        this.listeners[eventname].push({
            listener,
            once: once 
        });
    }

    off(eventname: string, listener: Function) {
        let listeners = this.listeners[eventname] || [];
        this.listeners[eventname] = listeners.filter(l => l.listener !== listener);
    }

    once(eventname: string, listener: Function) {
        this.on(eventname, listener, true);
    }

    protected emit(eventname: string, ...args: any[]) {
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