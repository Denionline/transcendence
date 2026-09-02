import { RouterProvider } from "react-router-dom";
import { router } from "./Router";
import { AuthProvider } from "./features/auth/AuthContext";
import { ThemeProvider } from "./features/theme/ThemeContext";
import { ToastProvider } from "./features/toast/ToastContext";
import { NotificationsProvider } from "./features/notifications/NotificationsContext";
import { MessagesProvider } from "./features/messages/MessagesContext";

export default function App() {
	return (
		<ThemeProvider>
			<ToastProvider>
				<AuthProvider>
					<NotificationsProvider>
						<MessagesProvider>
							<RouterProvider router={router} />
						</MessagesProvider>
					</NotificationsProvider>
				</AuthProvider>
			</ToastProvider>
		</ThemeProvider>
	);
}
