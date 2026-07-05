import js from "@eslint/js";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import prettier from "eslint-config-prettier";

export default tseslint.config(
	js.configs.recommended,
	...tseslint.configs.recommended,
	react.configs.flat.recommended,
	react.configs.flat["jsx-runtime"], // no need to import React in every file
	prettier,
	{
		plugins: { "react-hooks": reactHooks },
		rules: {
			...reactHooks.configs.recommended.rules,
			"prettier/prettier": ["error", { endOfLine: "auto", useTabs: true, tabWidth: 2 }],
		},
		settings: {
			react: { version: "detect" },
		},
	},
);
