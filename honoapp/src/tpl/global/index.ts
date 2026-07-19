import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import store from "../../store";

const sourceSchema = z.object({ source: z.string().min(1) });

export default function globalTplRouterCreate() {
  return new Hono({ strict: false })
  .basePath("/tpl/global")
  .get("/source", (ctx) => ctx.json(store.getState().globalTplActions.sourceRead()))
  .put("/source", zValidator("json", sourceSchema), (ctx) => {
    try {
      store.getState().globalTplActions.sourceUpdate(ctx.req.valid("json"));
      return ctx.json(null, 200);
    } catch (error) {
      return ctx.json({ error: error instanceof Error ? error.message : "Invalid global template source" }, 400);
    }
  })
  .post("/materialize", (ctx) => {
    store.getState().globalTplActions.outputMaterialize();
    return ctx.json(null, 200);
  })
  .get("/status", (ctx) => ctx.json(store.getState().globalTplActions.sourceRead()));
}
