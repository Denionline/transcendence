import type { Commitment } from "./types";

export const WORK_TYPES = [
	"Mural",
	"Illustration",
	"Photography",
	"Set design",
	"Lettering",
	"Editorial",
	"Poster",
	"3D",
] as const;

export const COMMITMENTS: { value: Commitment; label: string }[] = [
	{ value: "on-site", label: "On-site" },
	{ value: "remote", label: "Remote" },
	{ value: "hybrid", label: "Hybrid" },
];
