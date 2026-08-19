import { useEffect, useState } from "react";
import { ImagesIcon } from "lucide-react";
import { ApiError } from "../../../lib/apiClient";
import { deleteFile, listMyFiles } from "../../files/api";
import FileGallery from "../../files/components/FileGallery";
import FileUpload from "../../files/components/FileUpload";
import type { FileDto } from "../../files/types";

/**
 * The owner's view of their own files: everything they have uploaded, public
 * or not. The portfolio other people see is the `public` subset — there is no
 * second flag and no relation, a public file simply *is* a portfolio file.
 */
export default function PortfolioSection() {
	const [files, setFiles] = useState<FileDto[]>([]);
	const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
	const [showOnProfile, setShowOnProfile] = useState(true);
	const [deletingId, setDeletingId] = useState<string | null>(null);
	const [deleteError, setDeleteError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		listMyFiles()
			.then((items) => {
				if (cancelled) return;
				setFiles(items);
				setStatus("ready");
			})
			.catch(() => {
				if (!cancelled) setStatus("error");
			});
		return () => {
			cancelled = true;
		};
	}, []);

	async function handleDelete(file: FileDto) {
		setDeletingId(file.id);
		setDeleteError(null);
		try {
			await deleteFile(file.id);
		} catch (err) {
			//	404 is the one failure worth treating as success: the server does
			//	not have the file either, so this list was the stale party and
			//	dropping the row is the honest thing to do.
			if (!(err instanceof ApiError && err.status === 404)) {
				//	Anything else, the file is still there. Keep the row — removing
				//	it would be a lie — but say so, rather than letting a failed
				//	delete look exactly like a successful one.
				setDeleteError(
					`Couldn't delete ${file.originalName}. ` +
						(err instanceof Error ? err.message : "Please try again."),
				);
				return;
			}
		} finally {
			setDeletingId(null);
		}
		setFiles((previous) => previous.filter((entry) => entry.id !== file.id));
	}

	return (
		<div className="rounded-box border border-base-content/10 bg-base-100">
			<div className="flex items-center gap-2 border-b border-base-content/10 p-4">
				<ImagesIcon className="size-5 text-base-content/60" />
				<h2 className="font-semibold">Portfolio</h2>
			</div>

			<div className="flex flex-col gap-4 p-4">
				<label className="fieldset-label w-fit cursor-pointer gap-2">
					<input
						type="checkbox"
						className="toggle toggle-sm toggle-primary"
						checked={showOnProfile}
						onChange={(e) => setShowOnProfile(e.target.checked)}
					/>
					<span className="text-sm">Show new uploads on my public profile</span>
				</label>

				<FileUpload
					visibility={showOnProfile ? "public" : "private"}
					onUploaded={(file) => setFiles((previous) => [file, ...previous])}
				/>

				{status === "loading" && <span className="loading loading-spinner loading-sm" />}

				{status === "error" && (
					<div className="alert alert-error alert-soft py-2 text-sm">
						<span>Couldn&rsquo;t load your files. Reload the page to try again.</span>
					</div>
				)}

				{deleteError && (
					<div className="alert alert-error alert-soft py-2 text-sm">
						<span>{deleteError}</span>
					</div>
				)}

				{status === "ready" && (
					<FileGallery
						files={files}
						onDelete={handleDelete}
						deletingId={deletingId}
						emptyMessage="No uploads yet. Add an image, a track or a short reel."
					/>
				)}
			</div>
		</div>
	);
}
