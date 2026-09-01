import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { act, render, renderHook, screen, within } from "@testing-library/react";

//	Initialise i18next for its side effect: ToastProvider calls useTranslation
//	for the dismiss button's aria-label, and without this it warns on render.
import "../../i18n";
import { ToastProvider } from "./ToastContext";
import { useToast } from "./hooks/useToast";

//	renderHook mounts the wrapper (so the toast viewport is in document.body and
//	`screen` can query it) and hands back the context value to drive imperatively.
function setup() {
	return renderHook(() => useToast(), { wrapper: ToastProvider });
}

describe("ToastProvider", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.runOnlyPendingTimers();
		vi.useRealTimers();
	});

	test("shows a toast with its message", () => {
		const { result } = setup();

		act(() => {
			result.current.success("Saved");
		});

		expect(screen.getByText("Saved")).toBeInTheDocument();
	});

	test("an error toast announces itself assertively", () => {
		const { result } = setup();

		act(() => {
			result.current.error("Boom");
		});

		expect(screen.getByRole("alert")).toHaveTextContent("Boom");
	});

	test("auto-dismisses once its duration elapses", () => {
		const { result } = setup();

		act(() => {
			result.current.info("Transient", { duration: 1000 });
		});
		expect(screen.getByText("Transient")).toBeInTheDocument();

		act(() => {
			vi.advanceTimersByTime(1000);
		});
		expect(screen.queryByText("Transient")).not.toBeInTheDocument();
	});

	test("a duration of 0 keeps the toast until it is dismissed by hand", () => {
		const { result } = setup();

		act(() => {
			result.current.info("Sticky", { duration: 0 });
		});
		act(() => {
			vi.advanceTimersByTime(60_000);
		});

		expect(screen.getByText("Sticky")).toBeInTheDocument();
	});

	test("the dismiss button removes the toast", () => {
		const { result } = setup();

		act(() => {
			result.current.info("Closable", { duration: 0 });
		});

		const item = screen.getByText("Closable").closest("[role]") as HTMLElement;
		act(() => {
			within(item).getByRole("button").click();
		});

		expect(screen.queryByText("Closable")).not.toBeInTheDocument();
	});

	test("an identical toast already on screen is not stacked again", () => {
		const { result } = setup();

		//	Separate acts: de-dupe compares against what is committed, so this is
		//	the real case — the same live event arriving twice, a render apart.
		act(() => {
			result.current.success("Same");
		});
		act(() => {
			result.current.success("Same");
		});

		expect(screen.getAllByText("Same")).toHaveLength(1);
	});

	test("keeps at most three toasts, dropping the oldest", () => {
		const { result } = setup();

		act(() => {
			result.current.info("first", { duration: 0 });
			result.current.info("second", { duration: 0 });
			result.current.info("third", { duration: 0 });
			result.current.info("fourth", { duration: 0 });
		});

		expect(screen.queryByText("first")).not.toBeInTheDocument();
		expect(screen.getByText("second")).toBeInTheDocument();
		expect(screen.getByText("fourth")).toBeInTheDocument();
	});

	test("runs an action and then closes the toast", () => {
		const { result } = setup();
		const onClick = vi.fn();

		act(() => {
			result.current.info("Undo me", { duration: 0, action: { label: "Undo", onClick } });
		});
		act(() => {
			screen.getByRole("button", { name: "Undo" }).click();
		});

		expect(onClick).toHaveBeenCalledOnce();
		expect(screen.queryByText("Undo me")).not.toBeInTheDocument();
	});
});

describe("useToast", () => {
	test("throws when used outside a ToastProvider", () => {
		const spy = vi.spyOn(console, "error").mockImplementation(() => {});
		expect(() => render(<UnwrappedConsumer />)).toThrow(/within a ToastProvider/);
		spy.mockRestore();
	});
});

function UnwrappedConsumer() {
	useToast();
	return null;
}
