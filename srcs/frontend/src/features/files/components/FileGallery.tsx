import { useState } from "react";
import { Trash2Icon } from "lucide-react";
import Modal from "../../../components/Modal";
import FilePreview from "./FilePreview";
import { formatBytes } from "../constants";
import type { FileDto } from "../types";
import { useTranslation } from "react-i18next";

interface FileGalleryProps {
	files: FileDto[];
	/** Omit to render read-only — which is what another user's profile does. */
	onDelete?: (file: FileDto) => void;
	deletingId?: string | null;
	emptyMessage?: string;
}

export default function FileGallery({
	files,
	onDelete,
	deletingId,
	emptyMessage = "Nothing here yet.",
}: FileGalleryProps) {
	const { t } = useTranslation();
	const [previewFile, setPreviewFile] = useState<FileDto | null>(null);

	if (files.length === 0) {
		return <p className="text-sm text-base-content/50 italic">{emptyMessage}</p>;
	}

	return (
		<>
			<ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
				{files.map((file) => (
					<li
						key={file.id}
						className="group relative overflow-hidden rounded-box border border-base-content/10 bg-base-200"
					>
						<div
							className={
								file.type === "audio"
									? "flex aspect-4/3 items-center justify-center p-2"
									: "aspect-4/3"
							}
						>
							{file.type === "image" ? (
								<button
									type="button"
									aria-label={t("files.viewFullSize", { name: file.originalName })}
									onClick={() => setPreviewFile(file)}
									className="block h-full w-full cursor-zoom-in"
								>
									<FilePreview file={file} />
								</button>
							) : (
								<FilePreview file={file} />
							)}
						</div>

						<div className="flex items-center justify-between gap-2 p-2">
							<div className="min-w-0">
								<p className="truncate text-xs font-medium" title={file.originalName}>
									{file.originalName}
								</p>
								<p className="text-xs text-base-content/50">
									{formatBytes(file.sizeBytes)}
									{file.visibility === "private" && " · private"}
								</p>
							</div>

							{onDelete && (
								<button
									type="button"
									className="btn btn-ghost btn-xs text-error"
									aria-label={t("files.delete", { name: file.originalName })}
									disabled={deletingId === file.id}
									onClick={() => onDelete(file)}
								>
									{deletingId === file.id ? (
										<span className="loading loading-spinner loading-xs" />
									) : (
										<Trash2Icon className="size-4" />
									)}
								</button>
							)}
						</div>
					</li>
				))}
			</ul>

			<Modal
				open={previewFile !== null}
				onClose={() => setPreviewFile(null)}
				labelledBy="file-preview-title"
				size="lg"
			>
				<h2 id="file-preview-title" className="sr-only">
					{previewFile?.originalName ?? "Preview"}
				</h2>
				{previewFile && (
					<img
						src={previewFile.url}
						alt={previewFile.originalName}
						className="max-h-[80vh] w-full rounded-2xl object-contain"
					/>
				)}
			</Modal>
		</>
	);
}
