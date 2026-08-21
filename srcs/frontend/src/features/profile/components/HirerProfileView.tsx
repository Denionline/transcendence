import { type FormEvent, useEffect, useState } from "react";
import { Briefcase, Building2Icon, EyeIcon, MapPinIcon, PencilLineIcon } from "lucide-react";
import { useAuth } from "../../auth/hooks/useAuth";
import Avatar from "../../../components/Avatar";
import type { FileDto } from "../../files/types";
import { fetchMyProfile, saveMyProfile, type ProfileUpdate } from "../api";
import { notifyProfileUpdated } from "../profileEvents";
import LabeledField from "./LabeledField";
import PortfolioManager from "./PortfolioManager";

const MAX_BIO_LENGTH = 280;

type Status = { type: "success" | "error"; text: string } | null;

/** The hirer's own profile: a live preview card — mirroring how the artist
 *  profile mirrors the swipe deck — sitting above an editable form. */
export default function HirerProfileView() {
	const { user } = useAuth();

	const [organizationName, setOrganizationName] = useState("");
	const [bio, setBio] = useState("");
	const [location, setLocation] = useState("");
	const [status, setStatus] = useState<Status>(null);
	const [isSaving, setIsSaving] = useState(false);

	// The caller's own public files — same portfolio concept as the artist
	// side, backed by the same /api/files endpoints. Hirers don't get a
	// swipeable gallery preview (no card deck shows them one), just the
	// management grid.
	const [files, setFiles] = useState<FileDto[]>([]);

	useEffect(() => {
		if (!user) return;
		fetchMyProfile(user.id)
			.then((profile) => {
				setBio(profile.bio ?? "");
				setLocation(profile.location ?? "");
				setFiles(profile.portfolio);
				if ("organizationName" in profile) setOrganizationName(profile.organizationName);
			})
			// TODO: distinguish "no profile yet" (expected, leave form blank) from real errors
			.catch(() => {});
	}, [user]);

	function handleUploaded(file: FileDto) {
		setFiles((previous) => [file, ...previous]);
	}

	function handleDeleted(id: string) {
		setFiles((previous) => previous.filter((file) => file.id !== id));
	}

	if (!user) return null;

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		setStatus(null);
		setIsSaving(true);
		try {
			const payload: ProfileUpdate = {
				bio: bio.trim() || null,
				location: location.trim() || null,
				organizationName: organizationName.trim(),
			};
			await saveMyProfile(payload);
			notifyProfileUpdated();
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
		<div className="flex flex-col gap-6">
			<p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-base-content/40 uppercase">
				<EyeIcon className="size-3.5" aria-hidden="true" />
				Your public profile
			</p>

			<section className="overflow-hidden rounded-2xl border border-base-content/10 bg-base-100 shadow-sm transition-shadow duration-200 hover:shadow-md">
				<div className="h-20 bg-linear-to-r from-primary/15 via-secondary/10 to-transparent" />

				<div className="flex flex-col gap-4 p-5 pt-0">
					<div className="-mt-10 flex items-end gap-3">
						<Avatar
							username={user.username}
							avatarUrl={user.avatarUrl}
							size="lg"
							className="ring-4 ring-base-100 shadow"
						/>
						<div className="min-w-0 pb-1">
							<h2 className="truncate text-lg leading-snug font-semibold">
								{organizationName || user.username}
							</h2>
							<p className="flex items-center gap-1.5 truncate text-sm text-base-content/60">
								<Briefcase className="size-3.5" aria-hidden="true" />
								Hirer{location && ` · ${location}`}
							</p>
						</div>
					</div>

					{bio ? (
						<p className="text-sm leading-relaxed text-base-content/70">{bio}</p>
					) : (
						<p className="text-sm text-base-content/40">
							No bio yet — introduce your organization below.
						</p>
					)}
				</div>
			</section>

			<PortfolioManager files={files} onUploaded={handleUploaded} onDeleted={handleDeleted} />

			<section className="rounded-2xl border border-base-content/10 bg-base-100 shadow-sm">
				<div className="flex items-center gap-2.5 border-b border-base-content/10 p-4">
					<span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-base-200 text-base-content/60">
						<PencilLineIcon className="size-3.5" aria-hidden="true" />
					</span>
					<div>
						<h2 className="text-xs font-semibold tracking-wide text-base-content/50 uppercase">
							Edit hirer details
						</h2>
						<p className="mt-0.5 text-sm text-base-content/60">
							Shown to artists alongside your opportunities — changes above update instantly.
						</p>
					</div>
				</div>

				<form className="flex flex-col gap-5 p-4" onSubmit={handleSubmit}>
					{status && (
						<div
							className={`alert alert-soft ${status.type === "success" ? "alert-success" : "alert-error"}`}
						>
							<span>{status.text}</span>
						</div>
					)}

					<LabeledField label="Organization name" icon={Building2Icon}>
						<input
							type="text"
							className="input w-full pl-9"
							value={organizationName}
							onChange={(e) => setOrganizationName(e.target.value)}
							required
						/>
					</LabeledField>

					<LabeledField label="Bio" hint={`${bio.length}/${MAX_BIO_LENGTH}`}>
						<textarea
							className="textarea w-full"
							rows={3}
							maxLength={MAX_BIO_LENGTH}
							placeholder="What does your organization do, and what are you looking for?"
							value={bio}
							onChange={(e) => setBio(e.target.value)}
						/>
					</LabeledField>

					<LabeledField label="Location" icon={MapPinIcon}>
						<input
							type="text"
							className="input w-full pl-9"
							placeholder="City, country"
							value={location}
							onChange={(e) => setLocation(e.target.value)}
						/>
					</LabeledField>

					<div>
						<button
							type="submit"
							className="btn btn-primary btn-sm rounded-full transition-transform duration-150 hover:scale-[1.02]"
							disabled={isSaving}
						>
							{isSaving && <span className="loading loading-spinner loading-xs" />}
							Save changes
						</button>
					</div>
				</form>
			</section>
		</div>
	);
}
