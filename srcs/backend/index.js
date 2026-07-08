// For testing purposes

import express from "express";

const app = express();
const PORT = process.env.PORT || 9000;

app.get("/", (_req, res) => {
	res.status(200).send("Hello there!\n");
});

app.listen(PORT, () => {
	console.log(`Backend listening on port ${PORT}`);
});

app.get("/health", (req, res) => {
	res.json({ status: "ok" });
});
