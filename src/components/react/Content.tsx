import type { Choice } from "@/pages/api/generate/[node_id]";
import type { EventData } from "@/scripts/streams";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";

const Content = ({
    current_node,
    parent_node,
    content,
    choices,
}: {
    current_node: number;
    parent_node: number | null;
    content: string | null;
    choices: Choice[];
}) => {
    const [streamedContent, setStreamedContent] = useState(content || "");
    const [streamedChoices, setStreamedChoices] = useState(choices);

    console.log(`Node ${current_node}, has a content length of: ${streamedContent?.length}`);

    useEffect(() => {
        if (content && choices) return;

        const eventSource = new EventSource(`/api/generate/${current_node}`);
        eventSource.onmessage = (event) => {
            const data: EventData<unknown> = JSON.parse(event.data);
            console.log("Received event:", data);

            switch (data.type) {
                case "body":
                    setStreamedContent((prev) => prev + (data as EventData<string>).data);
                    console.log("Updated content:", streamedContent);
                    break;
                case "meta":
                    setStreamedChoices(() => (data as EventData<Choice[]>).data);
                    break;
                default:
                    console.error("Unrecognized event type:", data);
                    break;
            }
        };
        eventSource.onerror = (error) => {
            console.error("Streaming error:", error);
            eventSource.close();
        };
        return () => {
            eventSource.close();
        };
    }, [current_node, content, choices]);

    return (
        <>
            <article className="inline-block grow overflow-y-auto p-2">
                <span className="prose prose-stone dark:prose-invert">
                    <ReactMarkdown>{streamedContent}</ReactMarkdown>
                </span>
            </article>
            <footer>
                <nav>
                    <ol className="flex flex-col border-t border-stone-200 p-5 pt-3 text-start dark:border-stone-700">
                        {streamedChoices.map((choice, index) => (
                            <li key={choice.node_id}>
                                <a
                                    className="hover:text-adventure-700 dark:hover:text-adventure-400 flex flex-row gap-1 py-0.5 dark:text-stone-200"
                                    href={`/s/${choice.node_id}`}
                                >
                                    <span className="font-semibold">{index + 1}.</span>
                                    <span className="grow">
                                        <ReactMarkdown>{choice.label}</ReactMarkdown>
                                    </span>
                                </a>
                            </li>
                        ))}
                        {parent_node !== null && (
                            <li key="back">
                                <a
                                    className="text-quest-600 hover:text-quest-800 dark:text-quest-400 dark:hover:text-quest-500 flex flex-row gap-1 py-0.5"
                                    href={`/s/${parent_node}`}
                                >
                                    <span className="font-semibold">Q.</span>
                                    <span className="grow">Return to previous choices</span>
                                </a>
                            </li>
                        )}
                    </ol>
                </nav>
            </footer>
        </>
    );
};

export default Content;
