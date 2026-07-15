import { useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/hooks/useAuth";

export default function DiscoverPage() {
	const { user } = useAuth();
	const navigate = useNavigate();

	if (user?.role === "admin") navigate("/admin");
	return <h1>Discover page</h1>;
}
