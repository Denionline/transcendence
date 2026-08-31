import { useEffect, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from "react";
import { Trash2Icon } from "lucide-react";
import { formatTime } from "../../../lib/format";
import type { ChatMessageDto } from "../types";
import { useTranslation } from "react-i18next";

// How long a touch has to hold still before it counts as a long-press,
// and how far it can drift in that time before it's read as a scroll instead.
const LONG_PRESS_MS = 500;
const LONG_PRESS_MOVE_CANCEL_PX = 10;

interface MessageBubbleProps {
	message: ChatMessageDto;
	isMine: boolean;
	onDelete: (messageId: string) => void;
}

interface MenuPosition {
	x: number;
	y: number;
}

// Desktop opens the menu on right-click; touch opens it on a long-press —
// both land on the same small floating menu, positioned at the pointer.
export default function MessageBubble({ message, isMine, onDelete }: MessageBubbleProps) {
	const { t } = useTranslation();
	const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
	const longPressTimer = useRef<number | null>(null);
	const longPressStart = useRef<MenuPosition | null>(null);

	useEffect(() => {
		return () => {
			if (longPressTimer.current) window.clearTimeout(longPressTimer.current);
		};
	}, []);

	function clearLongPress() {
		if (longPressTimer.current) {
			window.clearTimeout(longPressTimer.current);
			longPressTimer.current = null;
		}
		longPressStart.current = null;
	}

	function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
		// Mouse uses the native right-click below, not a press-and-hold.
		if (!isMine || e.pointerType === "mouse") return;
		longPressStart.current = { x: e.clientX, y: e.clientY };
		longPressTimer.current = window.setTimeout(() => {
			if (longPressStart.current) setMenuPosition(longPressStart.current);
			clearLongPress();
		}, LONG_PRESS_MS);
	}

	function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
		const start = longPressStart.current;
		if (!start) return;
		const movedPx = Math.hypot(e.clientX - start.x, e.clientY - start.y);
		// Drifted too far to still be a hold in place — this is a scroll.
		if (movedPx > LONG_PRESS_MOVE_CANCEL_PX) clearLongPress();
	}

	function handleContextMenu(e: ReactMouseEvent<HTMLDivElement>) {
		if (!isMine) return;
		e.preventDefault();
		setMenuPosition({ x: e.clientX, y: e.clientY });
	}

	function handleDeleteClick() {
		setMenuPosition(null);
		onDelete(message.id);
	}

	return (
		<div
			className={`chat ${isMine ? "chat-end" : "chat-start"}`}
			onPointerDown={handlePointerDown}
			onPointerMove={handlePointerMove}
			onPointerUp={clearLongPress}
			onPointerCancel={clearLongPress}
			onContextMenu={handleContextMenu}
		>
			<div
				className={`chat-bubble ${isMine ? "chat-bubble-primary" : "bg-base-200 text-base-content"}`}
			>
				{message.content}
			</div>
			<div className="chat-footer text-xs text-base-content/40">
				{formatTime(message.createdAt)}
			</div>

			{menuPosition && (
				<>
					{/* Full-screen catcher — closes the menu on a click/tap anywhere else. */}
					<div
						className="fixed inset-0 z-40"
						onClick={() => setMenuPosition(null)}
						onContextMenu={(e) => {
							e.preventDefault();
							setMenuPosition(null);
						}}
					/>
					<ul
						className="menu fixed z-50 w-36 rounded-box bg-base-100 p-1 shadow-lg"
						style={{
							top: Math.min(menuPosition.y, window.innerHeight - 60),
							left: Math.min(menuPosition.x, window.innerWidth - 150),
						}}
					>
						<li>
							<button type="button" onClick={handleDeleteClick} className="text-error">
								<Trash2Icon className="size-4" aria-hidden="true" />
								{t("messages.delete")}
							</button>
						</li>
					</ul>
				</>
			)}
		</div>
	);
}
