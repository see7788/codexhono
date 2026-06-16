import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { z } from "zod";

type SseMessage = {
  text: string;
  stop?: boolean;
};

const connections = new Set<(message: SseMessage) => void>();

export const sseSend = async (message: SseMessage) => {
  for (const send of connections) {
    send(message);
  }
};

const ssePushRouter = new Hono()
  .post("/ssepush", zValidator("json", z.object({
    text: z.string(),
    stop: z.boolean().optional(),
  })), async (ctx) => {
    await sseSend(ctx.req.valid("json"));
    return ctx.json({ ok: true });
  });

const sseRouter = new Hono().basePath("/sse")
  .get("/events", (ctx) => streamSSE(ctx, async (stream) => {
    const send = (message: SseMessage) => {
      void stream.writeSSE({
        data: JSON.stringify(message),
      }).catch(() => {
        connections.delete(send);
      });
    };
    connections.add(send);
    await new Promise<void>((resolve) => {
      const close = () => {
        connections.delete(send);
        resolve();
      };
      ctx.req.raw.signal.addEventListener("abort", close, { once: true });
      stream.onAbort(close);
    });
  }));

export default new Hono().route("/", sseRouter).route("/", ssePushRouter);
