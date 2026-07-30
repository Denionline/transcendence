import { type ReactNode, createContext, useEffect, useState } from "react";
import { DEFAULT_THEME, THEME_STORAGE_KEY } from "./constants";

interface ThemeContextValue {
	theme: string;
	setTheme: (theme: string) => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

function getInitialTheme(): string {
	return localStorage.getItem(THEME_STORAGE_KEY) ?? DEFAULT_THEME;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
	const [theme, setTheme] = useState<string>(getInitialTheme);

	useEffect(() => {
		document.documentElement.setAttribute("data-theme", theme);
		localStorage.setItem(THEME_STORAGE_KEY, theme);
	}, [theme]);

	return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}
