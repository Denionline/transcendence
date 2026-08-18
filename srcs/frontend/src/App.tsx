import { RouterProvider } from "react-router-dom";
import { router } from "./Router";
import { AuthProvider } from "./features/auth/AuthContext";
import { ThemeProvider } from "./features/theme/ThemeContext";
import { NotificationsProvider } from "./features/notifications/NotificationsContext";

export default function App() {
	return (
		<ThemeProvider>
			<AuthProvider>
				<NotificationsProvider>
					<RouterProvider router={router} />
				</NotificationsProvider>
			</AuthProvider>
		</ThemeProvider>
	);
}
