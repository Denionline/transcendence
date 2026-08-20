import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/hooks/useAuth";
import ArtistProfileView from "../features/profile/components/ArtistProfileView";
import HirerProfileView from "../features/profile/components/HirerProfileView";

export default function ProfilePage() {
	const navigate = useNavigate();
	const { user } = useAuth();

	return (
		<div className="min-h-screen bg-base-100">
			<header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-base-content/10 bg-base-100 px-4 py-3 sm:px-6">
				<div className="flex min-w-0 items-center gap-3">
					<button
						type="button"
						onClick={() => navigate(-1)}
						className="btn btn-ghost btn-circle btn-sm"
						aria-label="Go back"
					>
						<ArrowLeft className="size-4" />
					</button>
					<h1 className="truncate font-bold">Profile</h1>
				</div>
			</header>

			<div className="mx-auto max-w-2xl animate-[fade-in_200ms_ease-out] px-4 py-6 sm:px-6">
				{user?.role === "artist" && <ArtistProfileView />}
				{user?.role === "hirer" && <HirerProfileView />}
				{user?.role === "admin" && (
					<div className="rounded-2xl border border-base-content/10 bg-base-100 p-4 text-sm text-base-content/60">
						Administrator accounts don&apos;t have an artist/hirer profile.
					</div>
				)}
			</div>
		</div>
	);
}
