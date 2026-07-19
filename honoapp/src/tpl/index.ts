import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import store from "../store";

export type { ProjectSource as Tpl } from "./output/schema";

const sourceSchema = z.object({ source: z.string().min(1) });

export default function tplRouterCreate() {
  const runtimeInputGet = () => {
    const runtimeAction = store.getState().runtimeAction;
    return {
      hostname: runtimeAction.hostnameGet(),
      port: runtimeAction.portGet(),
      workspacePath: runtimeAction.workspacePathGet(),
    };
  };
  return new Hono({ strict: false })
  .basePath("/tpl")
  .get("/", (ctx) => ctx.redirect("/#/tpl"))
  .get("/source", (ctx) => ctx.json(store.getState().tplActions.sourceRead(runtimeInputGet())))
  .put("/source", zValidator("json", sourceSchema), (ctx) => {
    try {
      store.getState().tplActions.sourceUpdate({ ...runtimeInputGet(), ...ctx.req.valid("json") });
      return ctx.json(null, 200);
    } catch (error) {
      return ctx.json({ error: error instanceof Error ? error.message : "Invalid project template source" }, 400);
    }
  })
  .post("/materialize", (ctx) => {
    store.getState().tplActions.outputMaterialize(runtimeInputGet());
    return ctx.json(null, 200);
  })
  .get("/status", (ctx) => ctx.json(store.getState().tplActions.sourceRead(runtimeInputGet())));
}
