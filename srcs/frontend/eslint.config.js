import js from "@eslint/js";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";
import prettierPlugin from "eslint-plugin-prettier";
import globals from "globals";

export default tseslint.config(
	{ ignores: ["dist"] },
	js.configs.recommended,
	...tseslint.configs.recommended,
	react.configs.flat.recommended,
	react.configs.flat["jsx-runtime"], // no need to import React in every file
	prettier,
	{
		plugins: { "react-hooks": reactHooks, prettier: prettierPlugin },
		rules: {
			...reactHooks.configs.recommended.rules,
			"prettier/prettier": "error", // uses the shared .prettierrc at the repo root
			"arrow-body-style": "off",
			"prefer-arrow-callback": "off",
			// React's escaping is what makes stored XSS a non-issue across every
			// profile, gig and chat message; this keeps that true by construction.
			"react/no-danger": "error",
		},
		settings: {
			react: { version: "detect" },
		},
	},
	{
		// Build-time scripts run under Node, not in the browser, so `console`
		// and `process` are legitimately available there.
		files: ["scripts/**/*.mjs"],
		languageOptions: { globals: globals.node },
	},
);
