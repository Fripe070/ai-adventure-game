// @ts-check

import js from "@eslint/js";
import ts from "typescript-eslint";
import prettier from "eslint-config-prettier/flat";
import astro from "eslint-plugin-astro";

export default ts.config(
    js.configs.recommended,
    ts.configs.recommended,
    ts.configs.stylistic,

    prettier,
    astro.configs.recommended,
    {
        ignores: ["dist/", "node_modules/", ".astro/", "bun.lockb", "src/env.d.ts"],
    },
);
