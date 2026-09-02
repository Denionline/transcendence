/** A windowed page list for a pager: first, last, and the pages around
 *  `current`, with "…" standing in for the gaps. Up to 7 pages render in full. */
export function getPageWindow(current: number, total: number): (number | "…")[] {
	if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

	const pages = new Set([1, total, current - 1, current, current + 1]);
	const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);

	const result: (number | "…")[] = [];
	sorted.forEach((p, i) => {
		if (i > 0 && p - sorted[i - 1] > 1) result.push("…");
		result.push(p);
	});
	return result;
}
