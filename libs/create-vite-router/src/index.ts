import { serveStatic } from "@hono/node-server/serve-static";
import fs from "node:fs";
import path from "node:path";
import { Hono } from "hono";
import type { Handler } from "hono";
import { build as viteBuild, createServer as createViteServer } from "vite";

export default async function createViteRouter(root: string, basePath?: string): Promise<Hono> {
  if (!root) {
    throw new Error("Missing vite package root");
  }

  const resolvedRoot = path.resolve(root);
  const pkgname = path.basename(resolvedRoot);
  const base = basePath ?? `/${pkgname}`;
  if (!pkgname) {
    throw new Error("Missing vite package name");
  }

  let handler: Handler;

  if (process.env.NODE_ENV === "development") {
    if (!fs.existsSync(resolvedRoot)) {
      throw new Error(`!fs.existsSync(${resolvedRoot})`);
    }

    const vite = await createViteServer({
      root: resolvedRoot,
      base,
      server: {
        middlewareMode: true,
        allowedHosts: true,
      },
    });

    handler = (c, next) =>
      new Promise((resolve) => {
        vite.middlewares(c.env.incoming, c.env.outgoing, () => resolve(next()));
      });
  } else {
    const distRoot = path.join(resolvedRoot, "dist");
    await viteBuild({
      root: resolvedRoot,
      base,
      build: {
        outDir: distRoot,
        emptyOutDir: true,
      },
    });

    if (!fs.existsSync(distRoot)) {
      throw new Error(`!fs.existsSync(${distRoot})`);
    }

    handler = serveStatic({
      root: distRoot,
      rewriteRequestPath: (requestPath: string): string =>
        requestPath === base || requestPath === `${base}/`
          ? "/index.html"
          : base === "/"
            ? requestPath
            : requestPath.replace(base, ""),
    });
  }

  const router = new Hono().all("/", handler).all("/*", handler);
  return base === "/" ? router : router.basePath(base);
}
