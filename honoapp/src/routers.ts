#!/usr/bin/env tsx

import { Hono } from "hono";
import { fileURLToPath } from "node:url";
import createViteRouter from "extends-hono/src/create-reactapp-router";
import chatRouterCreate from "./chat";
import emailRouter from "./email";
import fileRouter from "./file";
import sseUseRouter from "./sse";
import tplRouterCreate from "./tpl";
import globalTplRouterCreate from "./tpl/global";
const reactappRoot = fileURLToPath(new URL("../../reactapp", import.meta.url));
export default async function routersCreate() {
  return new Hono({ strict: false })
    .get("/favicon.ico", (ctx) => ctx.body(null, 204))
    .route("/", chatRouterCreate())
    .route("/", tplRouterCreate())
    .route("/", globalTplRouterCreate())
    .route("/", sseUseRouter)
    .route("/", emailRouter)
    .route("/", fileRouter)
    .route("/", await createViteRouter({root:reactappRoot}));
}
