import Tws from "./index";
export * from "./index";
import { ITwsOptions } from "./index";
/**
 * Dirty runtime require workaround ... there 's probably a better way of doing this.
 * But I'm not familiar enough with TS yet.
 * If you know of a better solution, tell me ;)
 */
declare var require: (module: string) => any;
// entry point for nodejs requiring ws or uws as the websocket implementation
let WSC: typeof WebSocket;
try {
  WSC = require("uws") as typeof WebSocket;
} catch(e) {
  WSC = require("ws") as typeof WebSocket;
}

export default function (options: ITwsOptions = {}) {
  let opts: ITwsOptions = Object.assign({}, { connectionOptions: {} }, options);
  opts.connectionOptions = Object.assign({}, { WebSocket: WSC });
  console.log(opts);
  return new Tws(opts);
}