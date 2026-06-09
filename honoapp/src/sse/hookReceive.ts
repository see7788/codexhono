import type sseUseRouter from ".";
import z from "zod";
import {hc} from "hono/client";
const pushHook = async () => {
  if (process.argv[2] !== "hook") return;

  const readStdin = async () => {
    let input = "";
    for await (const chunk of process.stdin) {
      input += chunk;
    }
    return input;
  };
  const input = await readStdin();
  const args = z.object({
    command: z.literal("hook"),
    codexPath: z.string().min(1),
    honoPath: z.string().min(1),
    hostname: z.string().min(1),
    port: z.coerce.number().int(),
    role: z.enum(["user", "assistant"]),
  }).parse({
    command: process.argv[2],
    codexPath: process.argv[3],
    honoPath: process.argv[4],
    hostname: process.argv[5],
    port: process.argv[6],
    role: process.argv[7],
  });
  const value = JSON.parse(input || "{}") as {
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
  const client = hc<typeof sseUseRouter>(`http://${args.hostname}:${args.port}`);
  await client.ssepush.$post({
    json: {
      text: texts.length > 0 ? texts.join("\n\n") : input,
      stop: true,
    },
  });
};

pushHook().catch((error) => {
  console.error("honocodex hook failed:", error);
  process.exitCode = 1;
});
