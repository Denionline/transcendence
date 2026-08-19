import "dotenv-expand/config";
import app from "./app.js";
import { styleText } from "node:util";
import { initWebsocket } from "./modules/websocket/websocket.gateway.js";
import { ensureUploadDir } from "./lib/storage.js";

const PORT = process.env.PORT || 9000;

// Before listen, not on first upload: a bare `git clone` has no upload
// directory, and a 500 on the first POST is a worse way to find that out.
await ensureUploadDir();

const httpServer = app.listen(PORT, () => {
	// eslint-disable-next-line no-console
	console.log(styleText("yellow", `Backend listening on port: ${PORT}\n`));
});

initWebsocket(httpServer);
