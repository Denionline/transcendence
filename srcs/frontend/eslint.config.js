import js from "@eslint/js";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import prettier from "eslint-config-prettier";
import prettierPlugin from "eslint-plugin-prettier";

export default tseslint.config(
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
		},
		settings: {
			react: { version: "detect" },
		},
	},
);
