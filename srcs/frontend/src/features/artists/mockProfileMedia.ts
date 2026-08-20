import type { ProfileMediaItem } from "./types";

/**
 * The backend only stores one `avatarUrl` per user today — there's no gallery,
 * video, or audio storage yet (see the unused `File` model in schema.prisma).
 * Until that pipeline exists, this synthesizes a plausible-looking media set
 * per artist so the profile pop-up's carousel/video/audio UI has something real
 * to page through. Everything here is deterministic (seeded by artist id), so
 * the same artist always shows the same gallery across renders and sessions.
 *
 * Swap this out for the real media list once `GET /profiles/:id` returns one —
 * `ProfileMediaItem` is shaped to match what that response should look like.
 */

// Small, well-known CC0 sample clips (hosted on MDN's own CDN, used throughout
// their <video>/<audio> docs) — stand-ins for real portfolio reels/voice notes.
const SAMPLE_VIDEO_URL = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";
const SAMPLE_AUDIO_URL =
	"https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3";

/** Tiny deterministic hash so the same seed always produces the same gallery. */
function hashSeed(seed: string): number {
	let hash = 0;
	for (let i = 0; i < seed.length; i++) {
		hash = (hash * 31 + seed.charCodeAt(i)) | 0;
	}
	return Math.abs(hash);
}

export function buildMockProfileMedia(
	seed: string,
	photoUrl: string | null | undefined,
): ProfileMediaItem[] {
	const hash = hashSeed(seed);
	const media: ProfileMediaItem[] = [];

	if (photoUrl) {
		media.push({ id: `${seed}-avatar`, type: "image", url: photoUrl, label: "Profile photo" });
	}

	// A couple of extra portfolio shots, picked deterministically per artist.
	// Always at least one, so the gallery never ends up empty even when the
	// artist has no avatarUrl.
	const extraPhotoCount = 1 + (hash % 2);
	for (let i = 0; i < extraPhotoCount; i++) {
		media.push({
			id: `${seed}-photo-${i}`,
			type: "image",
			url: `https://picsum.photos/seed/${encodeURIComponent(seed)}-${i}/900/1200`,
			label: `Portfolio photo ${i + 1}`,
		});
	}

	// Roughly half of profiles show a short reel, roughly a third a voice note —
	// enough variety to demo both players without every single card having one.
	if (hash % 2 === 0) {
		media.push({
			id: `${seed}-video`,
			type: "video",
			url: SAMPLE_VIDEO_URL,
			posterUrl: `https://picsum.photos/seed/${encodeURIComponent(seed)}-reel/900/1200`,
			label: "Reel",
		});
	}
	if (hash % 3 === 0) {
		media.push({ id: `${seed}-audio`, type: "audio", url: SAMPLE_AUDIO_URL, label: "Voice note" });
	}

	return media;
}
