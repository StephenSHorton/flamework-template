import eslint from "@eslint/js";
import { defineConfig } from "eslint/config";
import robloxTs from "eslint-plugin-roblox-ts";
import tseslint from "typescript-eslint";

export default defineConfig(
	{
		ignores: ["out/**"],
	},
	eslint.configs.recommended,
	...tseslint.configs.recommended,
	{
		files: ["src/**/*.ts", "src/**/*.tsx"],
		plugins: {
			"@typescript-eslint": tseslint.plugin,
			"roblox-ts": robloxTs,
		},
		languageOptions: {
			parser: tseslint.parser,
			parserOptions: {
				ecmaVersion: 2018,
				sourceType: "module",
				project: "./tsconfig.json",
				ecmaFeatures: {
					jsx: true,
				},
			},
		},
		rules: {
			...robloxTs.configs.recommended.rules,
			"@typescript-eslint/no-empty-object-type": "off",
			"@typescript-eslint/no-unused-vars": [
				"warn",
				{
					varsIgnorePattern: "^_",
					argsIgnorePattern: "^_",
					caughtErrorsIgnorePattern: "^_",
					destructuredArrayIgnorePattern: "^_",
				},
			],
		},
	},
);
