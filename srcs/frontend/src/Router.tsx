import { createBrowserRouter, Navigate } from "react-router-dom";
import AuthLayout from "./layouts/AuthLayout";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import NotFoundPage from "./pages/NotFoundPage";
import { ProtectedRoute } from "./features/auth/components/ProtectedRoute";
import AdminLayout from "./layouts/AdminLayout";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import type { UserRole } from "./features/auth/types";
import AppLayout from "./layouts/AppLayout";
import DiscoverPage from "./pages/DiscoverPage";

export function defaultPathForRole(role: UserRole): string {
	return role === "admin" ? "/admin" : "/discover";
}

export const router = createBrowserRouter([
	{ path: "/", element: <Navigate to="/discover" replace /> },
	{
		element: <AuthLayout />,
		children: [
			{ path: "/login", element: <LoginPage /> },
			{ path: "/register", element: <RegisterPage /> },
		],
	},
	{
		element: (
			<ProtectedRoute>
				<AppLayout />
			</ProtectedRoute>
		),
		children: [{ path: "/discover", element: <DiscoverPage /> }],
	},
	{
		element: (
			<ProtectedRoute requiredRole="admin">
				<AdminLayout />
			</ProtectedRoute>
		),
		children: [{ path: "/admin", element: <AdminDashboardPage /> }],
	},
	{ path: "*", element: <NotFoundPage /> },
]);
