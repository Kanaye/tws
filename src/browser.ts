// entrypoint for browsers settings up tws with the global websocket
import Tws from "./index";

Tws.WebSocket = WebSocket;

export default Tws;