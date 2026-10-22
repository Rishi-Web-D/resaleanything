import { createApp } from "./app";
import { purgeExpiredSessions } from "./auth";
import { config } from "./config";
import { initDb, sequelize } from "./db";

async function main() {
  await initDb();
  const app = createApp();
  const server = app.listen(config.port, config.host, () => console.log(`API listening on http://${config.host}:${config.port}`));

  const purge = setInterval(() => purgeExpiredSessions().catch((e) => console.error("session purge failed", e)), 3600_000);
  purge.unref();

  const shutdown = () => {
    server.close(async () => {
      await sequelize.close();
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
