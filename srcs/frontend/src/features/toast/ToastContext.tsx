import {
	type ReactNode,
	createContext,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { useTranslation } from "react-i18next";
import { XIcon } from "lucide-react";
import type { Toast, ToastOptions, ToastVariant } from "./types";

type VariantOptions = Omit<ToastOptions, "variant">;

interface ToastContextValue {
	/** Low-level entry point; `variant` defaults to `"info"`. Returns the id so
	 *  a caller can dismiss it early. */
	show: (message: string, options?: ToastOptions) => string;
	success: (message: string, options?: VariantOptions) => string;
	error: (message: string, options?: VariantOptions) => string;
	info: (message: string, options?: VariantOptions) => string;
	warning: (message: string, options?: VariantOptions) => string;
	dismiss: (id: string) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

// One place decides how long each severity lingers. Errors stay longest
// because they usually carry something the user has to act on; the rest are
// acknowledgements they can glance at.
const DEFAULT_DURATION: Record<ToastVariant, number> = {
	info: 4000,
	success: 4000,
	warning: 5000,
	error: 6000,
};

// A real-time feed can push the same event twice (a socket reconnect replays
// it, or two tabs share one user room). Past this the stack is just noise, so
// the oldest falls off.
const MAX_VISIBLE = 3;

// daisyUI alert modifiers — the toast is a themed `alert`, so it follows
// whatever daisyUI theme is active without any colour of its own.
const ALERT_CLASS: Record<ToastVariant, string> = {
	info: "alert-info",
	success: "alert-success",
	warning: "alert-warning",
	error: "alert-error",
};

let seq = 0;
function nextId(): string {
	seq += 1;
	return `toast-${Date.now().toString(36)}-${seq}`;
}

export function ToastProvider({ children }: { children: ReactNode }) {
	const { t } = useTranslation();
	const [toasts, setToasts] = useState<Toast[]>([]);
	// A live mirror of `toasts` so `show` can de-dupe against what is on
	// screen without taking `toasts` as a dependency (which would rebuild the
	// callback — and every consumer's memoised handlers — on every toast).
	const toastsRef = useRef<Toast[]>([]);
	useEffect(() => {
		toastsRef.current = toasts;
	}, [toasts]);

	// id -> pending removal timer, so hovering can pause a toast and dismiss
	// can cancel it.
	const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

	const clearTimer = useCallback((id: string) => {
		const handle = timers.current.get(id);
		if (handle !== undefined) {
			clearTimeout(handle);
			timers.current.delete(id);
		}
	}, []);

	const dismiss = useCallback(
		(id: string) => {
			clearTimer(id);
			setToasts((prev) => prev.filter((toast) => toast.id !== id));
		},
		[clearTimer],
	);

	const scheduleDismiss = useCallback(
		(id: string, duration: number) => {
			if (duration <= 0) return;
			clearTimer(id);
			timers.current.set(
				id,
				setTimeout(() => dismiss(id), duration),
			);
		},
		[clearTimer, dismiss],
	);

	const show = useCallback(
		(message: string, options: ToastOptions = {}) => {
			const variant = options.variant ?? "info";
			const duration = options.duration ?? DEFAULT_DURATION[variant];

			// An identical toast already up just gets its life extended.
			const twin = toastsRef.current.find(
				(toast) => toast.variant === variant && toast.message === message,
			);
			if (twin) {
				scheduleDismiss(twin.id, twin.duration);
				return twin.id;
			}

			const id = nextId();
			setToasts((prev) => {
				const next = [...prev, { id, variant, message, duration, action: options.action }];
				// Keep the updater pure — a dropped toast's timer is left to fire
				// and no-op against the now-shorter list, clearing itself then.
				return next.slice(-MAX_VISIBLE);
			});
			scheduleDismiss(id, duration);
			return id;
		},
		[scheduleDismiss],
	);

	// Drop every pending timer if the whole provider goes away.
	useEffect(() => {
		const pending = timers.current;
		return () => {
			pending.forEach((handle) => clearTimeout(handle));
			pending.clear();
		};
	}, []);

	const value = useMemo<ToastContextValue>(
		() => ({
			show,
			success: (message, options) => show(message, { ...options, variant: "success" }),
			error: (message, options) => show(message, { ...options, variant: "error" }),
			info: (message, options) => show(message, { ...options, variant: "info" }),
			warning: (message, options) => show(message, { ...options, variant: "warning" }),
			dismiss,
		}),
		[show, dismiss],
	);

	return (
		<ToastContext.Provider value={value}>
			{children}
			<div className="toast toast-end toast-bottom z-100 w-full max-w-sm">
				{toasts.map((toast) => (
					<div
						key={toast.id}
						// `alert` already carries role="alert" semantics for errors;
						// the rest announce politely so they don't interrupt.
						role={toast.variant === "error" ? "alert" : "status"}
						className={`alert ${ALERT_CLASS[toast.variant]} animate-[toast-in_180ms_ease-out] shadow-lg`}
						onMouseEnter={() => clearTimer(toast.id)}
						onMouseLeave={() => scheduleDismiss(toast.id, toast.duration)}
					>
						<span className="flex-1 text-sm">{toast.message}</span>
						{toast.action && (
							<button
								type="button"
								className="btn btn-ghost btn-xs"
								onClick={() => {
									toast.action?.onClick();
									dismiss(toast.id);
								}}
							>
								{toast.action.label}
							</button>
						)}
						<button
							type="button"
							aria-label={t("toast.dismiss")}
							className="btn btn-circle btn-ghost btn-xs"
							onClick={() => dismiss(toast.id)}
						>
							<XIcon className="size-3.5" aria-hidden="true" />
						</button>
					</div>
				))}
			</div>
		</ToastContext.Provider>
	);
}
