import { RouterProvider } from "react-router-dom";
import { router } from "./Router";
import { AuthProvider } from "./features/auth/AuthContext";

export default function App() {
	return (
		<AuthProvider>
			<RouterProvider router={router} />
		</AuthProvider>
	);
}
