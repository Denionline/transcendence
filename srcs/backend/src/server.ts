import "dotenv-expand/config";
import app from "./app.js";
import { styleText } from "node:util";
import { initWebsocket } from "./modules/websocket/websocket.gateway.js";

const PORT = process.env.PORT || 9000;

const httpServer = app.listen(PORT, () => {
	// eslint-disable-next-line no-console
	console.log(styleText("yellow", `Backend listening on port: ${PORT}\n`));
});

initWebsocket(httpServer);
