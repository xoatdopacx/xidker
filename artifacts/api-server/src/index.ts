import app from "./app";
import { logger } from "./lib/logger";
import { seedPackages } from "./lib/catalog";
import { seedTemplateSamples } from "./lib/templateSamples";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  // First start on a database: the starting price list, then the bundled templates as samples.
  void (async () => {
    try {
      await seedPackages();
      await seedTemplateSamples();
    } catch (err) {
      logger.error({ err }, "Could not add the starting packages or templates");
    }
  })();
});
