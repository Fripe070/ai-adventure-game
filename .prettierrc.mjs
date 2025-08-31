// @ts-check

/** @type {import("prettier").Config} */
export default {
    plugins: ["prettier-plugin-astro", "prettier-plugin-sql", "prettier-plugin-tailwindcss"],
    overrides: [
        {
            files: "*.astro",
            options: {
                parser: "astro",
            },
        },
        {
            files: "*.{yml,yaml}",
            options: {
                tabWidth: 2,
            },
        },
    ],
    useTabs: false,
    tabWidth: 4,
    printWidth: 100,
};
