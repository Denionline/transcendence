import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";

import FieldError from "./FieldError";

//	One component, but every form depends on it behaving these two ways:
//	rendering nothing when there is no error (so a valid form has no gap where
//	a message would go), and announcing itself when there is one.

describe("FieldError", () => {
	test("renders the message as an alert, so a screen reader announces it", () => {
		render(<FieldError message="Username is required" />);

		const alert = screen.getByRole("alert");
		expect(alert).toHaveTextContent("Username is required");
	});

	test("renders nothing at all when there is no message", () => {
		const { container } = render(<FieldError />);
		expect(container).toBeEmptyDOMElement();
	});

	//	"" is what a cleared error looks like coming out of a FieldErrors map,
	//	and it must not render an empty red paragraph.
	test("renders nothing for an empty message", () => {
		const { container } = render(<FieldError message="" />);
		expect(container).toBeEmptyDOMElement();
	});

	//	React escapes this — the test is here to prove the component has no
	//	dangerouslySetInnerHTML hiding in it, which eslint's react/no-danger
	//	also forbids repo-wide.
	test("escapes a message rather than rendering it as markup", () => {
		render(<FieldError message={"<img src=x onerror=alert(1)>"} />);

		const alert = screen.getByRole("alert");
		expect(alert.querySelector("img")).toBeNull();
		expect(alert).toHaveTextContent("<img src=x onerror=alert(1)>");
	});
});
