// For testing purposes

import express from "express";
import { fileURLToPath } from "url";

const app = express();
const PORT = process.env.PORT || 9000;

app.get("/", (_req, res) => {
	res.status(200).send("Hello there!\n");
});

app.get("/health", (_req, res) => {
	res.json({ status: "ok" });
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	app.listen(PORT, () => {
		console.log(`Backend listening on port ${PORT}`);
	});
}

export default app;
