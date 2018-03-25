import IWebsocketConstructor from "./Websocket";
import Tws from "./index";

/**
 * Dirty runtime require workaround ... there 's probably a better way of doing this.
 * But I'm not familiar enough with TS yet and I'm too lazy to search.
 * If you know of a better solution, tell me ;)
 */
declare var require: (module: string) => any;

// entry point for nodejs requiring ws or uws as the websocket implementation
let WebSocket: IWebsocketConstructor;
try {
  WebSocket = require("uws") as IWebsocketConstructor;
} catch(e) {
  WebSocket = require("ws") as IWebsocketConstructor;
}

Tws.WebSocket = WebSocket;

export default Tws;