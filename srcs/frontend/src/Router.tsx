import { createBrowserRouter, Navigate } from "react-router-dom";
import AuthLayout from "./layouts/AuthLayout";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import NotFoundPage from "./pages/NotFoundPage";
import { ProtectedRoute } from "./features/auth/components/ProtectedRoute";
import { PublicRoute } from "./features/auth/components/PublicRoute";
import { useAuth } from "./features/auth/hooks/useAuth";
import AdminLayout from "./layouts/AdminLayout";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import type { UserRole } from "./features/auth/types";
import AppLayout from "./layouts/AppLayout";
import DiscoverPage from "./pages/DiscoverPage";
import AdminUsersPage from "./pages/AdminUsersPage";
import AdminSettingsPage from "./pages/AdminSettingsPage";
import ShortlistPage from "./pages/ShortlistPage";
import MessagesPage from "./pages/MessagesPage";
import OpportunitiesPage from "./pages/OpportunitiesPage";
import SavedPage from "./pages/SavedPage";
import NewOpportunityPage from "./pages/NewOpportunityPage";
import SettingsPage from "./pages/SettingsPage";

export function defaultPathForRole(role: UserRole): string {
	if (role === "admin") return "/admin";
	return role === "hirer" ? "/discover" : "/opportunities";
}

function RootRedirect() {
	const { user, isLoading } = useAuth();

	if (isLoading) return null;
	if (!user) return <Navigate to="/login" replace />;
	return <Navigate to={defaultPathForRole(user.role)} replace />;
}

export const router = createBrowserRouter([
	{ path: "/", element: <RootRedirect /> },
	{
		element: (
			<PublicRoute>
				<AuthLayout />
			</PublicRoute>
		),
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
		children: [
			{ path: "/discover", element: <DiscoverPage /> },
			{ path: "/shortlist", element: <ShortlistPage /> },
			{ path: "/opportunities", element: <OpportunitiesPage /> },
			{ path: "/saved", element: <SavedPage /> },
			{ path: "/messages", element: <MessagesPage /> },
		],
	},
	{
		path: "/opportunities/new",
		element: (
			<ProtectedRoute>
				<NewOpportunityPage />
			</ProtectedRoute>
		),
	},
	{
		path: "/settings",
		element: (
			<ProtectedRoute>
				<SettingsPage />
			</ProtectedRoute>
		),
	},
	{
		element: (
			<ProtectedRoute requiredRole="admin">
				<AdminLayout />
			</ProtectedRoute>
		),
		children: [
			{ path: "/admin", element: <AdminDashboardPage /> },
			{ path: "/admin/users", element: <AdminUsersPage /> },
			{ path: "/admin/settings", element: <AdminSettingsPage /> },
		],
	},
	{ path: "*", element: <NotFoundPage /> },
]);
