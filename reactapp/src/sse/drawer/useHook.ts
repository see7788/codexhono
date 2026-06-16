import { useMemo } from "react";
import { useAsyncFn } from "react-use";
import appStore from "../../store";

const nodeStringClean = (text: string) => text
    .split(/\r?\n/)
    .filter(line => !/\bPID \d+\b/.test(line))
    .join("\n")
    .trim();

export default () => {
    const push = appStore(state => state.sse);
    const pushActions = appStore(state => state.sseActions);
    const nodeId = useMemo(() => appStore.getState().sse.targetId, [push.drawer.isOpen]);

    const contextText = useMemo(() => {
        const node = push.nodesObj[nodeId];
        const chatItem = push.chat.items[push.chat.index] ?? push.chat.items[0];
        if (!node || !chatItem) return "";
        const nodesPrompt = pushActions.nodesLoop(nodeId, push.chat.loopUp)
            .map(entry => [`node ${entry.id}:`, nodeStringClean(entry.string)].join("\n"))
            .join("\n\n");
        return [
            chatItem.prompt.trim(),
            nodesPrompt,
        ].filter(Boolean).join("\n\n");
    }, [nodeId, push.chat.index, push.chat.items, push.chat.loopUp, push.nodesObj, pushActions]);

    const [chatSubmitState, chatSubmit] = useAsyncFn(async () => {
        if (!push.nodesObj[nodeId]) return;
        await pushActions.chat(nodeId);
    }, [nodeId, push.chat.index, push.nodesObj, pushActions]);

    return {
        chatSubmit,
        contextText,
        isChatSubmitting: chatSubmitState.loading,
        nodeId,
    };
};
