import { type ChangeEvent, type FormEvent, useEffect, useState } from "react";
import {
	ArrowLeft,
	BellIcon,
	Check,
	CheckIcon,
	PaletteIcon,
	SlidersHorizontalIcon,
	UserRoundIcon,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/hooks/useAuth";
import { useTheme } from "../features/theme/hooks/useTheme";
import { THEMES } from "../features/theme/constants";
import { initials } from "../lib/format";
import OpportunityCard from "../features/opportunities/components/OpportunityCard";

type Section = "profile" | "preferences" | "notifications" | "appearance";

const SECTIONS: { id: Section; label: string; icon: typeof UserRoundIcon }[] = [
	{ id: "profile", label: "Profile", icon: UserRoundIcon },
	// { id: "preferences", label: "Preferences", icon: SlidersHorizontalIcon },
	// { id: "notifications", label: "Notifications", icon: BellIcon },
	{ id: "appearance", label: "Appearance", icon: PaletteIcon },
];

export default function SettingsPage() {
	const navigate = useNavigate();
	const { user, updateProfile } = useAuth();
	const [activeSection, setActiveSection] = useState<Section>("profile");

	const [displayName, setDisplayName] = useState(user?.username ?? "");
	const [email, setEmail] = useState(user?.email ?? "");
	const [bio, setBio] = useState("");
	const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
	const [status, setStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);
	const [isSaving, setIsSaving] = useState(false);

	useEffect(() => {
		return () => {
			if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
		};
	}, [avatarPreviewUrl]);

	function handleAvatarChange(e: ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (!file) return;
		setAvatarPreviewUrl((prev) => {
			if (prev) URL.revokeObjectURL(prev);
			return URL.createObjectURL(file);
		});
	}

	async function handleProfileSubmit(e: FormEvent) {
		e.preventDefault();
		setStatus(null);
		setIsSaving(true);
		try {
			await updateProfile({ username: displayName.trim(), email: email.trim() });
			setStatus({ type: "success", text: "Profile updated successfully." });
		} catch (err) {
			setStatus({
				type: "error",
				text: err instanceof Error ? err.message : "Update failed.",
			});
		} finally {
			setIsSaving(false);
		}
	}

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
					<h1 className="truncate font-bold">Settings</h1>
				</div>
				{activeSection === "profile" && (
					<button
						type="submit"
						form="settings-profile-form"
						className="btn btn-primary btn-sm rounded-full"
						disabled={isSaving}
					>
						{isSaving ? (
							<span className="loading loading-spinner loading-xs" />
						) : (
							<Check className="size-4" />
						)}
						Save changes
					</button>
				)}
			</header>

			<div className="mx-auto grid max-w-5xl gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[220px_1fr]">
				<nav className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
					{SECTIONS.map(({ id, label, icon: Icon }) => (
						<button
							key={id}
							type="button"
							onClick={() => setActiveSection(id)}
							className={`flex shrink-0 items-center gap-2 rounded-box px-3 py-2 text-sm font-medium transition-colors lg:w-full ${
								activeSection === id
									? "bg-base-200 text-base-content"
									: "text-base-content/60 hover:bg-base-200/60 hover:text-base-content"
							}`}
						>
							<Icon className="size-4" />
							{label}
						</button>
					))}
				</nav>

				<div className="min-w-0">
					{activeSection === "profile" && (
						<section className="rounded-box border border-base-content/10 bg-base-100">
							<div className="border-b border-base-content/10 p-4">
								<h2 className="text-xs font-semibold tracking-wide text-base-content/50 uppercase">
									Profile
								</h2>
							</div>

							<form
								id="settings-profile-form"
								className="flex flex-col gap-4 p-4"
								onSubmit={handleProfileSubmit}
							>
								{status && (
									<div
										className={`alert ${status.type === "success" ? "alert-success" : "alert-error"}`}
									>
										<span>{status.text}</span>
									</div>
								)}

								<div className="flex items-center gap-3">
									<div className="avatar avatar-placeholder shrink-0">
										<div className="w-16 rounded-full bg-neutral text-neutral-content">
											{avatarPreviewUrl ? (
												<img src={avatarPreviewUrl} alt="" className="rounded-full" />
											) : (
												<span className="text-lg">{initials(displayName || "?")}</span>
											)}
										</div>
									</div>
									<label className="btn btn-sm rounded-full">
										Change photo
										<input
											type="file"
											accept="image/*"
											className="hidden"
											onChange={handleAvatarChange}
										/>
									</label>
								</div>

								<div className="flex flex-col gap-4 sm:flex-row">
									<fieldset className="fieldset flex-1">
										<label className="label">Display name</label>
										<input
											type="text"
											className="input w-full"
											value={displayName}
											onChange={(e) => setDisplayName(e.target.value)}
											required
											disabled
										/>
									</fieldset>

									<fieldset className="fieldset flex-1">
										<label className="label">Email</label>
										<input
											type="email"
											className="input w-full"
											value={email}
											onChange={(e) => setEmail(e.target.value)}
											required
											disabled
										/>
									</fieldset>
								</div>

								<fieldset className="fieldset">
									<label className="label">Bio</label>
									<textarea
										className="textarea w-full"
										rows={3}
										placeholder="Tell people what you do..."
										value={bio}
										onChange={(e) => setBio(e.target.value)}
									/>
								</fieldset>
							</form>
						</section>
					)}

					{activeSection === "preferences" && (
						<EmptySection
							icon={SlidersHorizontalIcon}
							title="Preferences"
							description="Nothing to configure here yet — check back soon."
						/>
					)}

					{activeSection === "notifications" && (
						<EmptySection
							icon={BellIcon}
							title="Notifications"
							description="Notification settings aren't available yet — check back soon."
						/>
					)}

					{activeSection === "appearance" && <AppearanceSection />}
				</div>
			</div>
		</div>
	);
}

function EmptySection({
	icon: Icon,
	title,
	description,
}: {
	icon: typeof UserRoundIcon;
	title: string;
	description: string;
}) {
	return (
		<section className="rounded-box border border-base-content/10 bg-base-100">
			<div className="border-b border-base-content/10 p-4">
				<h2 className="text-xs font-semibold tracking-wide text-base-content/50 uppercase">
					{title}
				</h2>
			</div>
			<div className="flex flex-col items-center gap-2 p-10 text-center">
				<Icon className="size-6 text-base-content/30" />
				<p className="text-sm text-base-content/50">{description}</p>
			</div>
		</section>
	);
}

function AppearanceSection() {
	const { theme, setTheme } = useTheme();

	return (
		<section className="flex flex-col gap-6">
			<div className="rounded-box border border-base-content/10 bg-base-100">
				<div className="border-b border-base-content/10 p-4">
					<h2 className="text-xs font-semibold tracking-wide text-base-content/50 uppercase">
						Theme
					</h2>
					<p className="mt-1 text-sm text-base-content/60">
						Pick a theme for the whole application. Changes apply instantly.
					</p>
				</div>

				<div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-4">
					{THEMES.map(({ value, label }) => {
						const isActive = theme === value;
						return (
							<button
								key={value}
								type="button"
								onClick={() => setTheme(value)}
								aria-pressed={isActive}
								className={`relative overflow-hidden rounded-box border p-3 text-left transition-colors ${
									isActive
										? "border-primary ring-2 ring-primary"
										: "border-base-content/10 hover:border-base-content/30"
								}`}
								data-theme={value}
							>
								{isActive && (
									<span className="absolute top-2 right-2 rounded-full bg-primary p-0.5 text-primary-content">
										<CheckIcon className="size-3" />
									</span>
								)}
								<div className="mb-2 flex gap-1.5 rounded-box bg-base-100 p-2">
									<span className="size-4 rounded-full bg-primary" />
									<span className="size-4 rounded-full bg-secondary" />
									<span className="size-4 rounded-full bg-accent" />
									<span className="size-4 rounded-full bg-neutral" />
								</div>
								<span className="text-sm font-medium text-base-content">{label}</span>
							</button>
						);
					})}
				</div>
			</div>

			<div>
				<p className="mb-2 text-xs tracking-wide text-base-content/50 uppercase">
					Live preview · how this theme looks in your feed
				</p>
				<div className="max-w-xs">
					<OpportunityCard
						hirerName="Casa Verde Café"
						title="Hand-painted mural for our terrace launch"
						description="Neighborhood café commissioning local artists for seasonal murals."
						location="Lisbon"
						remoteOk={false}
						duration="2 weeks"
						tags={["Mural", "Acrylic"]}
						isNew
						coverPhotoUrl={null}
					/>
				</div>
			</div>
		</section>
	);
}
