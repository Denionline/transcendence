import app from "./app.js";
import { styleText } from "node:util";

const PORT = process.env.PORT || 9000;

app.listen(PORT, () => {
	console.log(styleText("yellow", `Backend listening on port: ${PORT}`));
});
