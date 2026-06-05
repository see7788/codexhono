#!/usr/bin/env tsx

import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import createViteRouter from "create-vite-router/src";
import chatRouter from "./chat";
import emailRouter from "./email";
import fileRouter from "./file";
import sseUseRouter from "./sse";
import tplRouter from "./tpl";
const reactappRoot = fileURLToPath(new URL("../../reactapp", import.meta.url));
process.env.NODE_ENV = "development"

export default new Hono()
    .get("/favicon.ico", (ctx) => ctx.body(null, 204))
    .route("/", chatRouter)
    .route("/", tplRouter)
    .route("/codex", sseUseRouter)
    .route("/", emailRouter)
    .route("/", fileRouter)
    .route("/", await createViteRouter(reactappRoot, "/"));
