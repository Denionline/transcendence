// For testing purposes

import React from "react";
import { createRoot } from "react-dom/client";

function App() {
	return <h1>If you can read this, congratulation!</h1>;
}

createRoot(document.getElementById("root")).render(<App />);
