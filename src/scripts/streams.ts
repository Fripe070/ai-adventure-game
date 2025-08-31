export interface EventData<T> {
    type: string;
    data: T;
}

export function createSSEStream(
    callback: (send: <D>(data: EventData<D>) => void) => Promise<void>,
): Response {
    const encoder = new TextEncoder();
    const streamResponse = new ReadableStream({
        async pull(controller) {
            const send = <D>(data: EventData<D>) =>
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
            await callback(send);
            controller.close();
        },
    });
    return new Response(streamResponse, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
        },
    });
}
