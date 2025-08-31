import type { SSRManifest } from "astro";
import { handle } from "@astrojs/cloudflare/handler";
import { App } from "astro/app";
import { createNewStory } from "./new_story";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function handleSchedule(controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    console.log("Scheduled function ran:", controller.cron);
    try {
        await createNewStory(env.aiAdventureDb);
    } catch (error) {
        console.error("Error creating new story:", error);
        throw error;
    }
}

export function createExports(manifest: SSRManifest) {
    const app = new App(manifest);
    return {
        default: {
            async fetch(request: Request, env: Env, ctx: ExecutionContext) {
                // @ts-expect-error "for some reason it doesnt like request"
                return handle(manifest, app, request, env, ctx);
            },
            async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext) {
                return await handleSchedule(controller, env, ctx);
            },
        } satisfies ExportedHandler<Env>,
    };
}
