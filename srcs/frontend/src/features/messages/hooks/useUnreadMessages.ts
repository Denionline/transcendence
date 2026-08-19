import { useContext } from "react";
import { MessagesContext } from "../MessagesContext";

export function useUnreadMessages() {
	const context = useContext(MessagesContext);
	if (!context) {
		throw new Error("useUnreadMessages must be used within a MessagesProvider");
	}
	return context;
}
