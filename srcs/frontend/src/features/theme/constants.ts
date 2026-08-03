export interface ThemeOption {
	value: string;
	label: string;
}

// Keep in sync with the themes listed in src/index.css.
export const THEMES: ThemeOption[] = [
	{ value: "forest", label: "Forest" },
	{ value: "light", label: "Light" },
	{ value: "dark", label: "Dark" },
	{ value: "cupcake", label: "Cupcake" },
	{ value: "corporate", label: "Corporate" },
	{ value: "synthwave", label: "Synthwave" },
	{ value: "cyberpunk", label: "Cyberpunk" },
	{ value: "dracula", label: "Dracula" },
	{ value: "night", label: "Night" },
	{ value: "winter", label: "Winter" },
	{ value: "luxury", label: "Luxury" },
	{ value: "coffee", label: "Coffee" },
];

export const DEFAULT_THEME = "forest";
export const THEME_STORAGE_KEY = "artmate_theme";
