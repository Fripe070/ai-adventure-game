// @ts-check
import { defineConfig, envField } from "astro/config";
import { fontProviders } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import tailwindcss from "@tailwindcss/vite";
import react from "@astrojs/react";

// https://astro.build/config
export default defineConfig({
    output: "server",

    integrations: [react()],
    adapter: cloudflare({
        platformProxy: { enabled: true },
        workerEntryPoint: {
            path: "src/scripts/worker_entry.ts",
            namedExports: [],
        },
    }),
    vite: {
        plugins: [tailwindcss()],
    },

    devToolbar: { enabled: false },
    env: {
        schema: {
            GEMINI_API_KEY: envField.string({ context: "server", access: "secret" }),
            GEMINI_MODEL: envField.string({
                context: "server",
                access: "public",
                default: "gemini-2.5-flash",
            }),
        },
    },
    experimental: {
        fonts: [
            {
                provider: fontProviders.google(),
                name: "Roboto Condensed",
                cssVariable: "--font-roboto-condensed",
                subsets: ["latin"],
                styles: ["normal", "italic"],
                weights: ["400", "700"],
            },
        ],
    },
});
