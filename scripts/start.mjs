// Production entry point for single-host deployments such as Azure App Service.
// Starts the Express API on loopback and the Next.js server on the platform's public PORT,
// and exits if either one dies so the host restarts the whole app.
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicPort = process.env.PORT ?? "3000";
const apiPort = process.env.API_PORT ?? "4000";

const children = [
  spawn(process.execPath, [path.join(root, "backend/dist/server.js")], {
    cwd: path.join(root, "backend"),
    stdio: "inherit",
    // The API is only reachable by the Next proxy on this machine.
    env: { ...process.env, PORT: apiPort, HOST: "127.0.0.1" },
  }),
  spawn(process.execPath, [path.join(root, "frontend/node_modules/next/dist/bin/next"), "start", "-p", publicPort, "-H", "0.0.0.0"], {
    cwd: path.join(root, "frontend"),
    stdio: "inherit",
    env: { ...process.env, BACKEND_URL: process.env.BACKEND_URL ?? `http://127.0.0.1:${apiPort}` },
  }),
];

let stopping = false;
function stop(code) {
  if (stopping) return;
  stopping = true;
  for (const c of children) c.kill("SIGTERM");
  setTimeout(() => process.exit(code), 8000).unref();
  Promise.all(children.map((c) => new Promise((r) => (c.exitCode !== null ? r() : c.once("exit", r))))).then(() => process.exit(code));
}

for (const c of children) c.on("exit", (code, signal) => {
  console.error(`child exited (code=${code}, signal=${signal}); shutting down`);
  stop(code ?? 1);
});
process.on("SIGTERM", () => stop(0));
process.on("SIGINT", () => stop(0));
