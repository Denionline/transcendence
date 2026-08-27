function hasAscii(buffer: Buffer, text: string, offset: number): boolean {
	return (
		buffer.length >= offset + text.length &&
		buffer.toString("ascii", offset, offset + text.length) === text
	);
}

function startsWith(buffer: Buffer, bytes: number[]): boolean {
	if (buffer.length < bytes.length) return false;
	return bytes.every((byte, index) => buffer[index] === byte);
}

//	An MPEG audio frame begins with eleven set bits. ID3-tagged files start
//	with the tag instead, which is the common case for anything with metadata.
function isMpegAudio(buffer: Buffer): boolean {
	if (hasAscii(buffer, "ID3", 0)) return true;
	return buffer.length >= 2 && buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0;
}

//	The brand is the only hint of audio versus video in an ISO container, and
//	a weak one — plenty of audio-only files are tagged "isom" — so a shared
//	brand answers "either" and the per-type size cap is what actually holds.
const AUDIO_BRANDS = ["M4A ", "M4B ", "mp4a"];

function isoBrands(buffer: Buffer): string[] | null {
	if (!hasAscii(buffer, "ftyp", 4)) return null;
	if (buffer.length < 12) return null;

	const brand = buffer.toString("ascii", 8, 12);
	return AUDIO_BRANDS.includes(brand) ? ["audio/mp4"] : ["video/mp4", "audio/mp4"];
}

export function sniffMime(buffer: Buffer): string[] | null {
	if (startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return ["image/png"];
	if (startsWith(buffer, [0xff, 0xd8, 0xff])) return ["image/jpeg"];
	if (hasAscii(buffer, "RIFF", 0) && hasAscii(buffer, "WEBP", 8)) return ["image/webp"];

	const iso = isoBrands(buffer);
	if (iso) return iso;

	//	Last: its frame sync is two bytes and would shadow a longer marker.
	if (isMpegAudio(buffer)) return ["audio/mpeg"];

	return null;
}

export function matchesDeclaredMime(buffer: Buffer, declaredMime: string): boolean {
	const sniffed = sniffMime(buffer);
	return sniffed !== null && sniffed.includes(declaredMime);
}
