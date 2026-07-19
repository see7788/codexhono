import type sseUseRouter from ".";
import {hc} from "hono/client";
export default async function hookReceive(input: {
  hostname: string;
  port: number;
  role: "user" | "assistant";
  stdin: string;
}) {
  const value = JSON.parse(input.stdin.trim() || "{}") as {
    prompt?: string | string[];
    last_assistant_message?: string | string[];
    message?: string | string[];
    text?: string | string[];
  };
  const texts = [
    value.prompt,
    value.last_assistant_message,
    value.message,
    value.text,
  ].flat().filter(item => typeof item === "string")
    .map((item) => {
      const request = item.split(/## My request for Codex:\s*/).at(-1)?.trim();
      return request || item.trim();
    })
    .filter(Boolean);
  const client = hc<typeof sseUseRouter>(`http://${input.hostname}:${input.port}`);
  await client.ssepush.$post({
    json: {
      text: texts.length > 0 ? texts.join("\n\n") : input.stdin,
      stop: true,
    },
  });
}
