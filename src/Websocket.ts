/**
 * WebSocket constructor interface.
 * cause I don't know (yet) how to use the one defined within the typescript lib
 */
export default interface IWebsocketConstructor {
    prototype: WebSocket;
    new(url: string, protocols?: string | string[]): WebSocket;
    readonly CLOSED: number;
    readonly CLOSING: number;
    readonly CONNECTING: number;
    readonly OPEN: number;
