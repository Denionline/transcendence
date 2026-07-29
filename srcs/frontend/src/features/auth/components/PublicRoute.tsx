import { Navigate } from "react-router";
import { useAuth } from "../hooks/useAuth";
import { defaultPathForRole } from "../../../Router";

interface PublicRouteProps {
	children: React.ReactNode;
}

export function PublicRoute({ children }: PublicRouteProps) {
	const { user, isLoading } = useAuth();

	if (isLoading) {
		return null;
	}

	if (user) {
		return <Navigate to={defaultPathForRole(user.role)} replace />;
	}

	return <>{children}</>;
}
