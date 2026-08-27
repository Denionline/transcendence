//	Adds the DOM matchers (toBeInTheDocument, toHaveAttribute, …) to vitest's
//	expect. Imported for its side effect; there is nothing to call.
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

//	Testing Library renders into a container it appends to document.body and
//	does not remove it itself outside of its own globals setup. Without this,
//	a getByRole in one test can match markup another test left behind.
afterEach(() => {
	cleanup();
});
