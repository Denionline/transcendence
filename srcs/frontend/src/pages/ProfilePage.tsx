import { type FormEvent, useEffect, useState } from "react";
import { Briefcase, UserRound } from "lucide-react";
import { useAuth } from "../features/auth/hooks/useAuth";
import Avatar from "../components/Avatar";
import { fetchMyProfile, saveMyProfile, type ProfileUpdate } from "../features/profile/api";
import { useCategories } from "../features/categories/hooks/useCategories";

type Status = { type: "success" | "error"; text: string } | null;

// Mirrors MAX_PROFILE_CATEGORIES in the backend's categories service.
const MAX_CATEGORIES = 10;

export default function ProfilePage() {
	const { user, updateProfile } = useAuth();

	const [username, setUsername] = useState(user?.username ?? "");
	const [email, setEmail] = useState(user?.email ?? "");
	const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? "");
	const [accountStatus, setAccountStatus] = useState<Status>(null);
	const [isSavingAccount, setIsSavingAccount] = useState(false);

	const { categories: vocabulary, isLoading: isLoadingCategories } = useCategories();
	const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);
	const [organizationName, setOrganizationName] = useState("");
	const [bio, setBio] = useState("");
	const [location, setLocation] = useState("");
	const [rate, setRate] = useState("");
	const [availability, setAvailability] = useState(true);
	const [detailsStatus, setDetailsStatus] = useState<Status>(null);
	const [isSavingDetails, setIsSavingDetails] = useState(false);

	useEffect(() => {
		if (!user) return;
		fetchMyProfile(user.id)
			.then((profile) => {
				setSelectedSlugs(profile.categories.map((category) => category.slug));
				setBio(profile.bio ?? "");
				setLocation(profile.location ?? "");
				setAvailability(profile.availability);
				if ("organizationName" in profile) setOrganizationName(profile.organizationName);
			})
			// TODO: distinguish "no profile yet" (expected, leave form blank) from real errors
			.catch(() => {});
	}, [user]);

	if (!user) return null;

	// The server caps a profile at MAX_PROFILE_CATEGORIES; mirroring it here
	// turns a 400 into a disabled button.
	function toggleCategory(slug: string) {
		setSelectedSlugs((previous) => {
			if (previous.includes(slug)) return previous.filter((entry) => entry !== slug);
			if (previous.length >= MAX_CATEGORIES) return previous;
			return [...previous, slug];
		});
	}

	async function handleAccountSubmit(e: FormEvent) {
		e.preventDefault();
		setAccountStatus(null);
		setIsSavingAccount(true);
		try {
			await updateProfile({
				username: username.trim(),
				email: email.trim(),
				avatarUrl: avatarUrl.trim() || null,
			});
			setAccountStatus({ type: "success", text: "Profile updated successfully." });
		} catch (err) {
			setAccountStatus({
				type: "error",
				text: err instanceof Error ? err.message : "Update failed.",
			});
		} finally {
			setIsSavingAccount(false);
		}
	}

	async function handleDetailsSubmit(e: FormEvent) {
		e.preventDefault();
		if (!user) return;
		setDetailsStatus(null);
		setIsSavingDetails(true);
		try {
			const base: ProfileUpdate = {
				categories: selectedSlugs,
				bio: bio.trim() || null,
				location: location.trim() || null,
			};
			const payload: ProfileUpdate =
				user.role === "hirer"
					? { ...base, organizationName: organizationName.trim() }
					: { ...base, rate: rate.trim() === "" ? null : Number(rate), availability };
			await saveMyProfile(payload);
			setDetailsStatus({ type: "success", text: "Details updated successfully." });
		} catch (err) {
			setDetailsStatus({
				type: "error",
				text: err instanceof Error ? err.message : "Update failed.",
			});
		} finally {
			setIsSavingDetails(false);
		}
	}

	return (
		<div className="flex flex-col gap-4">
			<div>
				<h1 className="text-xl font-bold">Profile</h1>
				<p className="text-sm text-base-content/60">Manage your account and profile details.</p>
			</div>

			<div className="rounded-box border border-base-content/10 bg-base-100">
				<div className="flex items-center gap-2 border-b border-base-content/10 p-4">
					<UserRound className="size-5 text-base-content/60" />
					<h2 className="font-semibold">Account</h2>
				</div>

				<form className="flex flex-col gap-4 p-4" onSubmit={handleAccountSubmit}>
					{accountStatus && (
						<div
							className={`alert ${accountStatus.type === "success" ? "alert-success" : "alert-error"}`}
						>
							<span>{accountStatus.text}</span>
						</div>
					)}

					<div className="flex items-center gap-4">
						<Avatar username={username || user.username} avatarUrl={avatarUrl || null} size="lg" />
						<p className="text-sm text-base-content/60">
							Paste an image URL below. Leave it blank to use your initials.
						</p>
					</div>

					<label className="fieldset-label flex-col items-start gap-1">
						<span className="text-sm font-medium">Username</span>
						<input
							type="text"
							className="input w-full max-w-sm"
							value={username}
							onChange={(e) => setUsername(e.target.value)}
							required
						/>
					</label>

					<label className="fieldset-label flex-col items-start gap-1">
						<span className="text-sm font-medium">Email</span>
						<input
							type="email"
							className="input w-full max-w-sm"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							required
						/>
					</label>

					<label className="fieldset-label flex-col items-start gap-1">
						<span className="text-sm font-medium">Avatar URL</span>
						<input
							type="url"
							className="input w-full max-w-sm"
							placeholder="https://..."
							value={avatarUrl}
							onChange={(e) => setAvatarUrl(e.target.value)}
						/>
					</label>

					<div>
						<button type="submit" className="btn btn-primary btn-sm" disabled={isSavingAccount}>
							{isSavingAccount && <span className="loading loading-spinner loading-xs" />}
							Save changes
						</button>
					</div>
				</form>
			</div>

			{user.role === "admin" ? (
				<div className="rounded-box border border-base-content/10 bg-base-100 p-4 text-sm text-base-content/60">
					Administrator accounts don&apos;t have an artist/hirer profile.
				</div>
			) : (
				<div className="rounded-box border border-base-content/10 bg-base-100">
					<div className="flex items-center gap-2 border-b border-base-content/10 p-4">
						<Briefcase className="size-5 text-base-content/60" />
						<h2 className="font-semibold">
							{user.role === "artist" ? "Artist details" : "Hirer details"}
						</h2>
					</div>

					<form className="flex flex-col gap-4 p-4" onSubmit={handleDetailsSubmit}>
						{detailsStatus && (
							<div
								className={`alert ${detailsStatus.type === "success" ? "alert-success" : "alert-error"}`}
							>
								<span>{detailsStatus.text}</span>
							</div>
						)}

						<fieldset className="fieldset-label flex-col items-start gap-1">
							<legend className="text-sm font-medium">
								Categories
								<span className="ml-1 font-normal text-base-content/60">
									(pick at least one, up to {MAX_CATEGORIES})
								</span>
							</legend>
							{isLoadingCategories ? (
								<span className="loading loading-spinner loading-sm" />
							) : (
								<div className="flex max-w-sm flex-wrap gap-2">
									{vocabulary.map((option) => {
										const isSelected = selectedSlugs.includes(option.slug);
										return (
											<button
												key={option.slug}
												type="button"
												className={`btn btn-xs ${isSelected ? "btn-primary" : "btn-outline"}`}
												aria-pressed={isSelected}
												onClick={() => toggleCategory(option.slug)}
											>
												{option.label}
											</button>
										);
									})}
								</div>
							)}
						</fieldset>

						{user.role === "hirer" && (
							<label className="fieldset-label flex-col items-start gap-1">
								<span className="text-sm font-medium">Organization name</span>
								<input
									type="text"
									className="input w-full max-w-sm"
									value={organizationName}
									onChange={(e) => setOrganizationName(e.target.value)}
									required
								/>
							</label>
						)}

						<label className="fieldset-label flex-col items-start gap-1">
							<span className="text-sm font-medium">Bio</span>
							<textarea
								className="textarea w-full max-w-sm"
								rows={3}
								value={bio}
								onChange={(e) => setBio(e.target.value)}
							/>
						</label>

						<label className="fieldset-label flex-col items-start gap-1">
							<span className="text-sm font-medium">Location</span>
							<input
								type="text"
								className="input w-full max-w-sm"
								value={location}
								onChange={(e) => setLocation(e.target.value)}
							/>
						</label>

						{user.role === "artist" && (
							<label className="fieldset-label flex-col items-start gap-1">
								<span className="text-sm font-medium">Rate</span>
								<input
									type="number"
									min={0}
									step={1}
									className="input w-full max-w-sm"
									value={rate}
									onChange={(e) => setRate(e.target.value)}
								/>
							</label>
						)}

						{user.role === "artist" && (
							<label className="fieldset-label flex items-center gap-2">
								<input
									type="checkbox"
									className="toggle"
									checked={availability}
									onChange={(e) => setAvailability(e.target.checked)}
								/>
								<span className="text-sm font-medium">Available for work</span>
							</label>
						)}

						<div>
							<button type="submit" className="btn btn-primary btn-sm" disabled={isSavingDetails}>
								{isSavingDetails && <span className="loading loading-spinner loading-xs" />}
								Save changes
							</button>
						</div>
					</form>
				</div>
			)}
		</div>
	);
}
