import immerStateCreator from "extends-zustand/src/immerStateCreator";
import { hc } from "hono/client";
import type chatRouter from "honoapp/src/chat";
import type sseUseRouter from "honoapp/src/sse";
const emptyText = "Empty node";
type NodesObjInfo_t = {
    parentId?: string;
    string: string;
}

type Node_t = NodesObjInfo_t & { id: string };
type SseMessage_t = {
    text: string;
    stop?: boolean;
};

const createPush = immerStateCreator<{
    sse: {
        maxId: string;
        targetId: string;
        nodesObj: Record<string, NodesObjInfo_t>;
        hookPushReceive?: boolean
        drawer: {
            isOpen?: boolean
        },
        chat: {
            loopUp?: boolean;//是否上循环
            temp: string;
            items: {
                label: string;//昵称
                prompt: string;//ai问话的特殊上下文
            }[];
            index: number;
        }
    };
    sseActions: {
        drawer: (nodeId: string) => void
        chat: (nodeId: string) => Promise<void>//执行ai问话，所需参数应该都具备了
        node: {
            childAdd(parentId: string, nodeString: string): string
            delete(nodeId: string): void
            branchDelete(nodeId: string): void
            parentSet(nodeId: string, parentId: string): void
            parentClear(nodeId: string): void
            stringSet(nodeId: string, nodeString: string): void
            targetIdSet(nodeId: string): void
        }
        nodesLoop(nodeId: string, loopUp?: boolean): Node_t[]
        hookPushReceive: () => void
    }
}>((set, get) => {
    const chatClient = hc<typeof chatRouter>(location.origin);
    return {
        sse: {
            maxId: "1",
            targetId: "1",
            hookPushReceive: true,
            nodesObj: {
                "1": {
                    string: emptyText,
                },
            },
            drawer: {
                isOpen:false
            },
            chat: {
                temp: "",
                items: [
                    { label: "llm.openai 对话", prompt: "Answer for the current node." },
                    {
                        label: "llm.openai 画图",
                        prompt: [
                            "You are an AI assistant that edits a project node tree.",
                            "Return newline-delimited JSON only. Do not wrap it in Markdown.",
                            "Every non-empty output line must be one valid JSON object.",
                            "Allowed event shapes:",
                            '{"type":"message","text":"short progress text"}',
                            '{"type":"operation","operation":{"type":"node.text","id":"existing node id","text":"new full node text"}}',
                            '{"type":"operation","operation":{"type":"node.replace","id":"existing node id","text":"replacement node text"}}',
                            '{"type":"operation","operation":{"type":"node.add","parentId":"existing parent id or omitted for root","text":"new node text"}}',
                            '{"type":"operation","operation":{"type":"node.move","id":"existing node id","parentId":"existing parent id or omitted for root"}}',
                            '{"type":"operation","operation":{"type":"node.delete","id":"existing node id"}}',
                            '{"type":"done"}',
                            "Do not delete every node. Prefer small, concrete edits.",
                        ].join("\n"),
                    },
                    { label: "agent.codexcli 对话", prompt: "Use the project context and answer for the current node." },
                ],
                index: 0,
            },
        },
        sseActions: {
            drawer: (nodeId) => {
                set((state) => {
                    if (!state.sse.nodesObj[nodeId]) return;
                    state.sse.targetId = nodeId;
                    state.sse.drawer.isOpen = !state.sse.drawer.isOpen;
                });
            },
            node: {
                childAdd: (parentId, nodeString) => {
                    const nodeId = String(Number(get().sse.maxId) + 1);
                    set((state) => {
                        if (!state.sse.nodesObj[parentId]) return;
                        state.sse.nodesObj[nodeId] = {
                            parentId,
                            string: nodeString.trim() || emptyText,
                        };
                        state.sse.maxId = nodeId;
                        state.sse.targetId = nodeId;
                    });
                    return nodeId;
                },
                delete: (nodeId) => {
                    set((state) => {
                        const node = state.sse.nodesObj[nodeId];
                        if (!node) return;
                        delete state.sse.nodesObj[nodeId];
                        for (const child of Object.values(state.sse.nodesObj)) {
                            if (child.parentId === nodeId) delete child.parentId;
                        }
                        if (!Object.keys(state.sse.nodesObj).length) {
                            const nextId = String(Number(state.sse.maxId) + 1);
                            state.sse.nodesObj[nextId] = { string: emptyText };
                            state.sse.maxId = nextId;
                            state.sse.targetId = nextId;
                            return;
                        }
                        if (state.sse.targetId === nodeId) {
                            state.sse.targetId = node.parentId && state.sse.nodesObj[node.parentId]
                                ? node.parentId
                                : Object.keys(state.sse.nodesObj).sort((left, right) => Number(left) - Number(right))[0] ?? state.sse.targetId;
                        }
                    });
                },
                branchDelete: (nodeId) => {
                    set((state) => {
                        const node = state.sse.nodesObj[nodeId];
                        if (!node) return;
                        const deleteIds = new Set([nodeId]);
                        for (let changed = true; changed;) {
                            changed = false;
                            for (const [currentId, current] of Object.entries(state.sse.nodesObj)) {
                                if (current.parentId && deleteIds.has(current.parentId) && !deleteIds.has(currentId)) {
                                    deleteIds.add(currentId);
                                    changed = true;
                                }
                            }
                        }
                        for (const currentId of deleteIds) delete state.sse.nodesObj[currentId];
                        if (!Object.keys(state.sse.nodesObj).length) {
                            const nextId = String(Number(state.sse.maxId) + 1);
                            state.sse.nodesObj[nextId] = { string: emptyText };
                            state.sse.maxId = nextId;
                            state.sse.targetId = nextId;
                            return;
                        }
                        if (deleteIds.has(state.sse.targetId)) {
                            state.sse.targetId = node.parentId && state.sse.nodesObj[node.parentId]
                                ? node.parentId
                                : Object.keys(state.sse.nodesObj).sort((left, right) => Number(left) - Number(right))[0] ?? state.sse.targetId;
                        }
                    });
                },
                parentSet: (nodeId, parentId) => {
                    set((state) => {
                        const node = state.sse.nodesObj[nodeId];
                        if (!node || nodeId === parentId || !state.sse.nodesObj[parentId]) return;
                        for (let currentId: string | undefined = parentId; currentId !== undefined;) {
                            if (currentId === nodeId) return;
                            currentId = state.sse.nodesObj[currentId]?.parentId;
                        }
                        node.parentId = parentId;
                        state.sse.targetId = nodeId;
                    });
                },
                parentClear: (nodeId) => {
                    set((state) => {
                        const node = state.sse.nodesObj[nodeId];
                        if (node) delete node.parentId;
                    });
                },
                stringSet: (nodeId, nodeString) => {
                    set((state) => {
                        const node = state.sse.nodesObj[nodeId];
                        if (!node) return;
                        node.string = nodeString.trim() || emptyText;
                    });
                },
                targetIdSet: (nodeId) => {
                    set((state) => {
                        if (!state.sse.nodesObj[nodeId]) return;
                        state.sse.targetId = nodeId;
                    });
                },
            },
            hookPushReceive: () => {
                const events = new EventSource(hc<typeof sseUseRouter>(`${location.origin}`).sse.events.$url());
                events.addEventListener("message", (event) => {
                    const message = JSON.parse(event.data) as SseMessage_t;
                    const text = message.text.trim();
                    if (!text) return;
                    set((state) => {
                        if (!state.sse.hookPushReceive) return;
                        const parentId = state.sse.nodesObj[state.sse.targetId]
                            ? state.sse.targetId
                            : undefined;
                        const nodeId = String(Number(state.sse.maxId) + 1);
                        state.sse.nodesObj[nodeId] = {
                            parentId,
                            string: text,
                        };
                        state.sse.maxId = nodeId;
                        state.sse.targetId = nodeId;
                    });
                });
                events.addEventListener("error", () => {
                    events.close();
                });
            },
            nodesLoop: (nodeId, loopUp) => {
                const nodesObj = get().sse.nodesObj;
                if (!nodesObj[nodeId]) return [];

                if (loopUp) {
                    const entries: Node_t[] = [];
                    const visited = new Set<string>();
                    for (let currentId: string | undefined = nodeId; currentId !== undefined;) {
                        if (visited.has(currentId)) break;
                        visited.add(currentId);
                        const node: NodesObjInfo_t | undefined = nodesObj[currentId];
                        if (!node) break;
                        entries.unshift({ id: currentId, ...node });
                        currentId = node.parentId;
                    }
                    return entries;
                }

                const childrenByParentId: Record<string, string[]> = {};
                for (const [currentId, node] of Object.entries(nodesObj)) {
                    if (!node.parentId) continue;
                    childrenByParentId[node.parentId] ??= [];
                    childrenByParentId[node.parentId].push(currentId);
                }

                const entries: Node_t[] = [];
                const visited = new Set<string>();
                const stack = [nodeId];
                while (stack.length) {
                    const currentId = stack.pop()!;
                    if (visited.has(currentId)) continue;
                    visited.add(currentId);
                    const node = nodesObj[currentId];
                    if (!node) continue;
                    entries.push({ id: currentId, ...node });
                    const childIds = childrenByParentId[currentId] ?? [];
                    for (let index = childIds.length - 1; index >= 0; index--) stack.push(childIds[index]);
                }
                return entries;
            },
            chat: async (nodeId) => {
                const push = get().sse;
                const node = push.nodesObj[nodeId];
                if (!node) return;
                const chatItemIndex = push.chat.index;
                const chatItem = push.chat.items[chatItemIndex] ?? push.chat.items[0];
                if (!chatItem) return;
                const chatTargets = [
                    { request: chatClient.chat.llm.openai, response: "node" },
                    { request: chatClient.chat.llm.openai, response: "graph" },
                    { request: chatClient.chat.agent.codexcli, response: "node" },
                ];
                const chatTarget = chatTargets[chatItemIndex] ?? chatTargets[0];
                const targetName = chatItem.label;
                const targetPrompt = chatItem.prompt.trim();
                if (!chatTarget) return;
                const nodeStringClean = (text: string) => text
                    .split(/\r?\n/)
                    .filter(line => !/\bPID \d+\b/.test(line))
                    .join("\n")
                    .trim();
                const nodesPrompt = get().sseActions.nodesLoop(nodeId, push.chat.loopUp)
                    .map(entry => [`node ${entry.id}:`, nodeStringClean(entry.string)].join("\n"))
                    .join("\n\n");
                const requestPrompt = [
                    targetPrompt,
                    nodesPrompt,
                ].filter(Boolean).join("\n\n");
                let output = "";
                try {
                    set((state) => {
                        state.sse.chat.temp = "";
                    });
                    const response = await chatTarget.request.$post({ json: { prompt: requestPrompt } });
                    if (!response.ok) {
                        output = (await response.text()).trim() || `${targetName} request failed: ${response.status}`;
                        set((state) => {
                            state.sse.chat.temp = output;
                        });
                    } else {
                        const reader = response.body?.getReader();
                        if (!reader) {
                            output = (await response.text()).trim() || `${targetName} response has no body`;
                            set((state) => {
                                state.sse.chat.temp = output;
                            });
                        } else {
                            const decoder = new TextDecoder();
                            for (; ;) {
                                const result = await reader.read();
                                if (result.done) break;
                                output += decoder.decode(result.value, { stream: true });
                                set((state) => {
                                    state.sse.chat.temp = output;
                                });
                            }
                            output += decoder.decode();
                            set((state) => {
                                state.sse.chat.temp = output;
                            });
                        }
                    }
                } catch (error) {
                    output = error instanceof Error ? error.message : String(error);
                    set((state) => {
                        state.sse.chat.temp = output;
                    });
                }
                output = output.trim() || `${targetName} response is empty`;
                set((state) => {
                    state.sse.chat.temp = output;
                });
                if (chatTarget.response === "node") {
                    const childId = String(Number(get().sse.maxId) + 1);
                    set((state) => {
                        if (!state.sse.nodesObj[nodeId]) return;
                        state.sse.nodesObj[childId] = {
                            parentId: nodeId,
                            string: output,
                        };
                        state.sse.maxId = childId;
                        state.sse.targetId = childId;
                    });
                    return;
                }
                type GraphOperation_t =
                    | { id: string; text: string; type: "node.text" }
                    | { id: string; text: string; type: "node.replace" }
                    | { parentId?: string; text: string; type: "node.add" }
                    | { id: string; parentId?: string; type: "node.move" }
                    | { id: string; type: "node.delete" };
                const operations = output
                    .split(/\r?\n/)
                    .map((line): GraphOperation_t | undefined => {
                        if (line.startsWith("```")) return undefined;
                        const jsonLine = line.startsWith("data:") ? line.slice("data:".length).trim() : line;
                        try {
                            const event = JSON.parse(jsonLine) as { operation?: unknown; type?: string };
                            const operation = (event.type === "operation" ? event.operation : event) as Partial<GraphOperation_t>;
                            if (
                                (operation.type === "node.text" || operation.type === "node.replace")
                                && typeof operation.id === "string"
                                && typeof operation.text === "string"
                            ) return { id: operation.id, text: operation.text, type: operation.type };
                            if (
                                operation.type === "node.add"
                                && typeof operation.text === "string"
                                && (operation.parentId === undefined || typeof operation.parentId === "string")
                            ) return { parentId: operation.parentId, text: operation.text, type: operation.type };
                            if (
                                operation.type === "node.move"
                                && typeof operation.id === "string"
                                && (operation.parentId === undefined || typeof operation.parentId === "string")
                            ) return { id: operation.id, parentId: operation.parentId, type: operation.type };
                            if (operation.type === "node.delete" && typeof operation.id === "string") return { id: operation.id, type: operation.type };
                        } catch {
                            return undefined;
                        }
                        return undefined;
                    })
                    .filter((operation): operation is GraphOperation_t => !!operation);
                for (const operation of operations) {
                    set((state) => {
                        if (operation.type === "node.text" || operation.type === "node.replace") {
                            const targetNode = state.sse.nodesObj[operation.id];
                            if (targetNode) targetNode.string = operation.text.trim() || emptyText;
                            return;
                        }
                        if (operation.type === "node.add") {
                            const parentId = operation.parentId;
                            if (parentId && !state.sse.nodesObj[parentId]) return;
                            const childId = String(Number(state.sse.maxId) + 1);
                            state.sse.nodesObj[childId] = {
                                parentId,
                                string: operation.text.trim() || emptyText,
                            };
                            state.sse.maxId = childId;
                            state.sse.targetId = childId;
                            return;
                        }
                        if (operation.type === "node.move") {
                            const targetNode = state.sse.nodesObj[operation.id];
                            if (!targetNode) return;
                            if (operation.parentId === undefined) {
                                delete targetNode.parentId;
                                return;
                            }
                            if (operation.parentId === operation.id || !state.sse.nodesObj[operation.parentId]) return;
                            for (let currentId: string | undefined = operation.parentId; currentId !== undefined;) {
                                if (currentId === operation.id) return;
                                currentId = state.sse.nodesObj[currentId]?.parentId;
                            }
                            targetNode.parentId = operation.parentId;
                            return;
                        }
                        const targetNode = state.sse.nodesObj[operation.id];
                        if (!targetNode) return;
                        delete state.sse.nodesObj[operation.id];
                        for (const child of Object.values(state.sse.nodesObj)) {
                            if (child.parentId === operation.id) delete child.parentId;
                        }
                        if (state.sse.targetId === operation.id) {
                            state.sse.targetId = targetNode.parentId && state.sse.nodesObj[targetNode.parentId]
                                ? targetNode.parentId
                                : Object.keys(state.sse.nodesObj).sort((a, b) => Number(a) - Number(b))[0] ?? state.sse.targetId;
                        }
                    });
                }
            },
        },
    };
});

export default createPush;
