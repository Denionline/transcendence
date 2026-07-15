import { Navigate, useLocation } from "react-router";
import type { UserRole } from "../types";
import { useAuth } from "../hooks/useAuth";

interface ProtectedRouteProps {
	children: React.ReactNode;
	requiredRole?: UserRole;
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
	const { user, isLoading } = useAuth();
	const location = useLocation();

	if (isLoading) {
		// return <FullPageSpinner />; // or null
		return null;
	}

	if (!user) {
		// remember the intended destination for post-login redirect
		return <Navigate to="/login" state={{ from: location }} replace />;
	}

	if (requiredRole && user.role !== requiredRole) {
		return <Navigate to="/discover" replace />;
	}

	return <>{children}</>;
}
