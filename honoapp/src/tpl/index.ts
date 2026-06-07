import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import store from "../store";
import { z } from "zod";

const contentSchema = z.string();
const skillDirSchema = z.object({ dir: z.string().min(1).regex(/^[^/\\]+$/) });

const codextplRouter = new Hono()
  .basePath("/tpl")
  .get("/source", (ctx) => {
    return ctx.json(store.getState().tplActions.sourceRead());
  })
  .post("/source", zValidator("json", contentSchema), (ctx) => {
    const source = ctx.req.valid("json");
    store.getState().tplActions.sourceChange(source);
    return ctx.body(null, 200);
  })
  .put("/agentsMd", zValidator("json", contentSchema), (ctx) => {
    const content = ctx.req.valid("json");
    store.getState().tplActions.agentsMdWrite(content);
    return ctx.body(null, 200);
  })
  .delete("/agentsMd", (ctx) => {
    store.getState().tplActions.agentsMdDelete();
    return ctx.body(null, 200);
  })
  .get("/configToml", (ctx) => {
    return ctx.text(store.getState().tplActions.configTomlRead());
  })
  .put("/configToml", zValidator("json", contentSchema), (ctx) => {
    const content = ctx.req.valid("json");
    store.getState().tplActions.configTomlWrite(content);
    return ctx.body(null, 200);
  })
  .delete("/configToml", (ctx) => {
    store.getState().tplActions.configTomlDelete();
    return ctx.body(null, 200);
  })
  .put("/skills/:dir", zValidator("param", skillDirSchema), zValidator("json", contentSchema), (ctx) => {
    const { dir } = ctx.req.valid("param");
    const content = ctx.req.valid("json");
    store.getState().tplActions.skillWrite(dir, content);
    return ctx.body(null, 200);
  })
  .delete("/skills/:dir", zValidator("param", skillDirSchema), (ctx) => {
    const { dir } = ctx.req.valid("param");
    store.getState().tplActions.skillDelete(dir);
    return ctx.body(null, 200);
  });

export default codextplRouter;
