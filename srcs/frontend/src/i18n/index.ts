import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import en from "./locales/en.json";
import pt from "./locales/pt.json";
import es from "./locales/es.json";


export const SUPPORTED_LANGUAGES = [
	{ code: "en", label: "English" },
	{ code: "pt", label: "Português" },
	{ code: "es", label: "Español" },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]["code"];

/** Key under which the detector persists the user's choice. */
export const LANGUAGE_STORAGE_KEY = "artmate:language";

void i18n
	// Picks the initial language from localStorage, then the browser's own
	// setting — so a first-time Portuguese visitor lands on Portuguese without
	// touching anything, and a returning user keeps whatever they last chose.
	.use(LanguageDetector)
	.use(initReactI18next)
	.init({
		resources: {
			en: { translation: en },
			pt: { translation: pt },
			es: { translation: es },
		},
		fallbackLng: "en",
		// Only these three are real. Without this, a browser reporting "pt-BR"
		// or "es-419" would look for a locale file that doesn't exist and fall
		// straight through to English; `load: "languageOnly"` strips the region
		// so pt-BR resolves to pt.
		supportedLngs: SUPPORTED_LANGUAGES.map((language) => language.code),
		load: "languageOnly",
		detection: {
			order: ["localStorage", "navigator"],
			lookupLocalStorage: LANGUAGE_STORAGE_KEY,
			caches: ["localStorage"],
		},
		interpolation: {
			// React escapes interpolated values already; letting i18next escape
			// them too would double-encode apostrophes and accented characters.
			escapeValue: false,
		},
		// Surface missing keys loudly in development instead of quietly showing
		// the key name. In production the fallback language covers it.
		debug: false,
	});

export default i18n;
