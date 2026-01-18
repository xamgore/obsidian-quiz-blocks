import tseslint from 'typescript-eslint';
import obsidianmd from "eslint-plugin-obsidianmd";
import globals from "globals";
import { globalIgnores } from "eslint/config";
import type { CompatibleConfigArray } from "typescript-eslint/dist/compatibility-types";

export default tseslint.config(
	globalIgnores([
		"node_modules",
		"dist",
		"esbuild.config.mjs",
		"eslint.config.*",
		"version-bump.mjs",
		"versions.json",
		"main.js",
	]),
	...obsidianmd.configs!.recommended as CompatibleConfigArray[],
	{
		files: ["**/*.{js,jsx,mjs,cjs}"],
		rules: {},
		languageOptions: {
			parserOptions: {
				projectService: {
					allowDefaultProject: [
						'eslint.config.js',
						'manifest.json'
					]
				},
				tsconfigRootDir: import.meta.dirname,
				extraFileExtensions: ['.json']
			},
			globals: {
				...globals.browser,
			},
		},
	},
	{
		files: ["**/*.{ts,tsx,mts,cts}"],
		plugins: {
			"@typescript-eslint": tseslint.plugin,
		},
		languageOptions: {
			parser: tseslint.parser,
			parserOptions: {
				project: "./tsconfig.json",
				tsconfigRootDir: import.meta.dirname,
				extraFileExtensions: ['.json']
			},
			globals: {
				...globals.browser,
			},
		},
		rules: {
			"@typescript-eslint/require-await": "error",
			"require-await": "off",
		},
	},
);
