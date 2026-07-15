import { useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/hooks/useAuth";

export default function DiscoverPage() {
	const { user } = useAuth();
	const navigate = useNavigate();

	console.log(user);
	if (user?.role == "admin") {
		navigate("/admin", { replace: true });
	}
	return <h1>Discover page</h1>;
}
