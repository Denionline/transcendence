export type ToastVariant = "info" | "success" | "warning" | "error";

export interface ToastAction {
	label: string;
	onClick: () => void;
}

export interface ToastOptions {
	variant?: ToastVariant;
	/** Milliseconds on screen before auto-dismiss. `0` keeps it up until the
	 *  user dismisses it by hand. */
	duration?: number;
	action?: ToastAction;
}

export interface Toast {
	id: string;
	variant: ToastVariant;
	message: string;
	duration: number;
	action?: ToastAction;
}
