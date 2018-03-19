// entrypoint for browsers settings up tws with the global websocket
import Tws from "./Tws";

Tws.WebSocket = WebSocket;

export default Tws;