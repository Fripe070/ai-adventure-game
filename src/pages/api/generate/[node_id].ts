import { GoogleGenAI, Type, type Content } from "@google/genai";
import type { APIRoute } from "astro";
import { GEMINI_API_KEY, GEMINI_MODEL } from "astro:env/server";
import GmInstructions from "@/assets/gm_instructions.txt?raw";
import ChoiceInstructions from "@/assets/choice_instructions.txt?raw";
import { createSSEStream } from "@/scripts/streams";

export interface Choice {
    label: string;
    node_id: number;
}

interface StorySegment {
    story_id: number;
    choice_label: string | null;
    story_content: string | null;
}

async function getStory(db: D1Database, untilNode: number): Promise<StorySegment[]> {
    const storyParts: StorySegment[] = [];
    let nodeId: number | null = untilNode;
    while (nodeId) {
        const node: (StorySegment & { parent_node_id: number | null; story_id: number }) | null =
            await db
                .prepare(
                    "SELECT story_id, choice_label, story_content, parent_node_id FROM nodes WHERE node_id = ?",
                )
                .bind(nodeId)
                .first();
        if (!node) break;
        storyParts.push({
            story_id: node.story_id,
            choice_label: node.choice_label,
            story_content: node.story_content,
        });
        nodeId = node.parent_node_id;
    }
    return storyParts.reverse();
}

export const GET: APIRoute = async ({ params: { node_id }, locals }) => {
    const { aiAdventureDb } = locals.runtime.env;

    if (!node_id) return new Response("Missing node_id", { status: 400 });
    const nodeId = Number(node_id);
    if (isNaN(nodeId)) return new Response("Invalid node_id", { status: 400 });

    const storySegments = await getStory(aiAdventureDb, nodeId);
    if (!storySegments) return new Response("Story not found", { status: 404 });
    if (storySegments[storySegments.length - 1]?.story_content)
        return new Response("Node already has story content", { status: 400 });

    let chatHistory: Content[] = [];
    for (const segment of storySegments.slice(0, -1)) {
        if (segment.choice_label) {
            chatHistory.push({
                role: "user",
                parts: [{ text: segment.choice_label }],
            });
        }
        if (segment.story_content) {
            chatHistory.push({
                role: "model",
                parts: [{ text: segment.story_content }],
            });
        }
    }

    return createSSEStream(async (send) => {
        const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

        const storyChat = ai.chats.create({
            model: GEMINI_MODEL,
            config: {
                systemInstruction: GmInstructions,
            },
            history: chatHistory,
        });

        const storyStream = await storyChat.sendMessageStream({
            message: storySegments[storySegments.length - 1]?.choice_label ?? "<no choice>",
        });

        let newStoryPart = "";
        for await (const chunk of storyStream) {
            send<string>({
                type: "body",
                data: chunk.text ?? "",
            });
            newStoryPart += chunk.text ?? "";
        }
        console.log("New story part:", newStoryPart);
        chatHistory = storyChat.getHistory();

        let updateResult = await aiAdventureDb
            .prepare("UPDATE nodes SET story_content = ? WHERE node_id = ?")
            .bind(newStoryPart, nodeId)
            .run();
        if (!updateResult.success) console.error("Failed to update story content:", updateResult);

        const metaChat = ai.chats.create({
            model: GEMINI_MODEL,
            config: {
                systemInstruction: ChoiceInstructions,

                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.STRING,
                    },
                },
            },
            history: chatHistory,
        });
        const meta = await metaChat.sendMessage({
            message: "What are the choices?",
        });

        const choices: Choice[] = [];
        for (const choiceLabel of JSON.parse(meta.text ?? "[]") as string[]) {
            updateResult = await aiAdventureDb
                .prepare(
                    "INSERT INTO nodes (story_id, parent_node_id, choice_label) VALUES (?, ?, ?)",
                )
                .bind(storySegments[0].story_id, nodeId, choiceLabel)
                .run();
            if (!updateResult.success) console.error("Failed to insert choice:", updateResult);
            choices.push({ label: choiceLabel, node_id: updateResult.meta.last_row_id });
        }

        send<Choice[]>({
            type: "meta",
            data: choices,
        });
        console.log("Chat history:", chatHistory);
    });
};
