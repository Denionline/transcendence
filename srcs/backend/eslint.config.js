import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

export default tseslint.config(
	js.configs.recommended,
	...tseslint.configs.recommended,
	prettier, // must be last — disables rules that conflict with Prettier
	{
		languageOptions: {
			globals: { process: "readonly" }, // Node globals
		},
		rules: {
			"@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
			"no-console": "warn",
			"prettier/prettier": ["error", { endOfLine: "auto", useTabs: true, tabWidth: 2 }],
		},
	},
);
