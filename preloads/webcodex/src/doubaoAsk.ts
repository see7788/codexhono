type DoubaoAskEvent =
  | { type: "delta"; text: string; fullText: string }
  | { type: "done"; text: string }
  | { type: "error"; error: string };


declare global {
  interface Window {
    doubaoAsk: (question: string, callback: (event: DoubaoAskEvent) => void) => Promise<string>;
  }
}

export function doubaoAskInstall() {
  const doubaoAskPageScript = String.raw`
(() => {
  if (window.doubaoAsk) return;

  const webpackRequireGet = () => {
    let webpackRequire;
    window.__LOADABLE_LOADED_CHUNKS__.push([[Math.random()], {}, require => {
      webpackRequire = require;
    }]);
    return webpackRequire;
  };

  const chatInputGet = () => {
    const textarea = document.querySelector('textarea[placeholder="发消息..."]') || document.querySelector("textarea");
    if (!textarea) throw new Error("Doubao input textarea not found");

    const fiberKey = Object.keys(textarea).find(key => key.startsWith("__reactFiber$"));
    let fiber = fiberKey ? textarea[fiberKey] : null;
    for (let index = 0; fiber && index < 160; index += 1) {
      const chatInput = fiber.memoizedProps?.chatInputRef?.current;
      if (chatInput?.setText && chatInput?.submit) return chatInput;
      fiber = fiber.return;
    }
    throw new Error("Doubao chatInputRef not found");
  };

  const messageIdGet = message => (
    message?.message_id
    || message?.local_message_id
    || message?.unique_id
    || message?.reply_id
    || ""
  );

  const textBlockGet = block => (
    block?.content?.text_block?.text
    || block?.content?.code_block?.code
    || block?.content?.text
    || block?.text
    || ""
  );

  const messageTextGet = message => {
    const blocks = [
      ...(Array.isArray(message?.content_blocks_v2) ? message.content_blocks_v2 : []),
      ...(Array.isArray(message?.content_blocks) ? message.content_blocks : []),
    ];
    const blockText = blocks.map(textBlockGet).join("");
    return blockText || message?.content_obj?.text || "";
  };

  const aiMessageEntriesGet = state => {
    const entries = [];
    for (const messageMap of [state?.messageMap, state?.localMessageMap]) {
      for (const bucket of Object.values(messageMap || {})) {
        const messages = Array.isArray(bucket) ? bucket : Object.values(bucket || {});
        for (const message of messages) {
          if (!message || message.user_type === 1) continue;
          const messageId = messageIdGet(message);
          const text = messageTextGet(message);
          if (messageId && text) entries.push([messageId, text, message]);
        }
      }
    }
    return entries;
  };

  const textSnapshotGet = state => new Map(
    aiMessageEntriesGet(state).map(([messageId, text]) => [messageId, text]),
  );

  window.doubaoAsk = (question, callback = event => console.log("event:", event)) => new Promise((resolve, reject) => {
    try {
      const webpackRequire = webpackRequireGet();
      const messageStore = webpackRequire?.(465400)?.GH;
      if (!messageStore?.getState || !messageStore?.subscribe) throw new Error("Doubao message store not found");

      const chatInput = chatInputGet();
      const baselineTextById = textSnapshotGet(messageStore.getState());
      const emittedTextById = new Map(baselineTextById);
      let fullText = "";
      let settled = false;
      let idleTimer = 0;

      const finish = () => {
        if (settled) return;
        settled = true;
        clearTimeout(idleTimer);
        unsubscribe?.();
        callback({ type: "done", text: fullText });
        resolve(fullText);
      };

      const fail = error => {
        if (settled) return;
        settled = true;
        clearTimeout(idleTimer);
        unsubscribe?.();
        const message = error instanceof Error ? error.message : String(error);
        callback({ type: "error", error: message });
        reject(error);
      };

      const stateChangeHandle = state => {
        try {
          for (const [messageId, text, message] of aiMessageEntriesGet(state)) {
            const emittedText = emittedTextById.get(messageId) || "";
            if (text.length <= emittedText.length) continue;

            const delta = text.startsWith(emittedText) ? text.slice(emittedText.length) : text;
            emittedTextById.set(messageId, text);
            fullText += delta;
            callback({ type: "delta", text: delta, fullText });

            clearTimeout(idleTimer);
            idleTimer = window.setTimeout(finish, message?.is_finish ? 80 : 1200);
          }
        } catch (error) {
          fail(error);
        }
      };

      const unsubscribe = messageStore.subscribe(stateChangeHandle);
      chatInput.setText(question);
      requestAnimationFrame(() => {
        try {
          chatInput.submit();
        } catch (error) {
          fail(error);
        }
      });
      idleTimer = window.setTimeout(() => fail(new Error("Doubao answer timeout")), 45000);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      callback({ type: "error", error: message });
      reject(error);
    }
  });
})();
`;
  const script = document.createElement("script");
  script.textContent = doubaoAskPageScript;
  document.documentElement.appendChild(script);
  script.remove();
  return window.doubaoAsk
}
