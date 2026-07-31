import { useEffect } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { XIcon } from "lucide-react";

interface ModalProps {
	open: boolean;
	onClose: () => void;
	labelledBy: string;
	children: ReactNode;
}

export default function Modal({ open, onClose, labelledBy, children }: ModalProps) {
	useEffect(() => {
		if (!open) return;
		function handleKeyDown(e: KeyboardEvent) {
			if (e.key === "Escape") onClose();
		}
		window.addEventListener("keydown", handleKeyDown);
		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
			document.body.style.overflow = previousOverflow;
		};
	}, [open, onClose]);

	if (!open) return null;

	return createPortal(
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
			<div
				className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-[fade-in_180ms_ease-out]"
				onClick={onClose}
			/>
			<div
				role="dialog"
				aria-modal="true"
				aria-labelledby={labelledBy}
				className="relative z-10 max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-base-content/10 bg-base-100 shadow-2xl animate-[modal-pop-in_220ms_cubic-bezier(0.16,1,0.3,1)]"
			>
				<button
					type="button"
					onClick={onClose}
					aria-label="Close"
					className="btn btn-circle btn-sm absolute top-3 right-3 z-10 border-none bg-base-100/80 backdrop-blur hover:bg-base-100"
				>
					<XIcon className="size-4" aria-hidden="true" />
				</button>
				{children}
			</div>
		</div>,
		document.body,
	);
}
