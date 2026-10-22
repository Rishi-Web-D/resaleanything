import { createApp } from "./app";
import { config } from "./config";
import { dbHost, disconnectDb, initDb } from "./db";

async function main() {
  await initDb();
  console.log(`Connected to MongoDB at ${dbHost()}`);
  const app = createApp();
  const server = app.listen(config.port, config.host, () => console.log(`API listening on http://${config.host}:${config.port}`));

  const shutdown = () => {
    server.close(async () => {
      await disconnectDb();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
