import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";
import prettierPlugin from "eslint-plugin-prettier";

export default tseslint.config(
	js.configs.recommended,
	...tseslint.configs.recommended,
	prettier, // must be last — disables rules that conflict with Prettier
	{
		languageOptions: {
			globals: { process: "readonly", console: "readonly", fetch: "readonly" },
		},
		plugins: { prettier: prettierPlugin },
		rules: {
			"@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
			"no-console": "warn",
			"prettier/prettier": "error", // uses the shared .prettierrc at the repo root
			"arrow-body-style": "off",
			"prefer-arrow-callback": "off",
		},
	},
);
