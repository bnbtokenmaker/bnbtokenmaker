/**
 * BNB Token Maker — cPanel / Passenger production entry (server.js).
 *
 * Starts the Next.js application (App Router) through the officially supported
 * programmatic server API documented in
 * `node_modules/next/dist/docs/01-app/02-guides/custom-server.md`.
 *
 * - No custom routing, no Express, no dev server.
 * - Honors the PORT host-provided by cPanel (process.env.PORT) and an optional
 *   HOSTNAME; falls back to a local-only 3000 default for manual runs.
 * - Runs in production except when NODE_ENV is explicitly "development".
 * - Logs no secrets; fatal startup errors exit(1) so Passenger restarts.
 */

"use strict";

const { createServer } = require("node:http");
const next = require("next");

const parsedPort = Number.parseInt(process.env.PORT || "3000", 10);
const port = Number.isInteger(parsedPort) && parsedPort > 0 ? parsedPort : 3000;
const hostname = process.env.HOSTNAME || "0.0.0.0";
const dev = process.env.NODE_ENV === "development";

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

let httpServer = null;

app
  .prepare()
  .then(() => {
    httpServer = createServer((req, res) => {
      handle(req, res).catch((error) => {
        console.error("[bnbtokenmaker] Request handler error:", error);
        if (!res.headersSent) {
          res.writeHead(502);
        }
        res.end();
      });
    });
    httpServer.listen(port, hostname, () => {
      console.log(
        `[bnbtokenmaker] Next.js ready on ${hostname}:${port} (${dev ? "development" : "production"})`
      );
    });
  })
  .catch((error) => {
    console.error("[bnbtokenmaker] Failed to start:", error);
    process.exit(1);
  });

function shutdown(signal) {
  console.log(`[bnbtokenmaker] Received ${signal}, shutting down.`);
  if (httpServer) {
    httpServer.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 5000).unref();
  } else {
    process.exit(0);
  }
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));