import { GoogleGenAI, Type } from "@google/genai";
import { GEMINI_API_KEY, GEMINI_MODEL } from "astro:env/server";
import StoryInstructions from "@/assets/story_instructions.txt?raw";
import ChoiceInstructions from "@/assets/choice_instructions.txt?raw";
import TitleInstructions from "@/assets/title_instructions.txt?raw";

export async function createNewStory(db: D1Database): Promise<void> {
    console.log("Making new story...");

    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

    //#region Story generation
    const storyChat = ai.chats.create({
        model: GEMINI_MODEL,
        history: [],
    });
    const storyText = (await storyChat.sendMessage({ message: StoryInstructions })).text;
    console.log("New story created:");
    console.log(storyText);

    const storyTitle = (
        await storyChat.sendMessage({
            message: TitleInstructions,
        })
    ).text;
    console.log("Story title:", storyTitle);

    const storyResult = await db
        .prepare("INSERT INTO stories (title) VALUES (?)")
        .bind(storyTitle)
        .run();
    const storyId = storyResult.meta.last_row_id;

    const rootResult = await db
        .prepare("INSERT INTO nodes (story_id, story_content) VALUES (?, ?)")
        .bind(storyId, storyText)
        .run();
    const rootId = rootResult.meta.last_row_id;
    console.log("Inserted story and root part:", storyId, rootId);
    //#endregion

    //#region Choice generation
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
        history: [
            {
                role: "model",
                parts: [{ text: storyText }],
            },
        ],
    });
    const meta = await metaChat.sendMessage({
        message: "What are the choices?",
    });

    for (const choiceLabel of JSON.parse(meta.text ?? "[]") as string[]) {
        console.log("Inserting choice:", choiceLabel);
        const updateResult = await db
            .prepare("INSERT INTO nodes (story_id, parent_node_id, choice_label) VALUES (?, ?, ?)")
            .bind(storyId, rootId, choiceLabel)
            .run();
        if (!updateResult.success) console.error("Failed to insert choice:", updateResult);
    }
    //#endregion
}
