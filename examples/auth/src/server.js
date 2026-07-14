import { buildApp } from './app.js';
import { loadConfig } from './config.js';

const config = loadConfig();
const app = buildApp({ config, logger: true });

try {
  await app.listen({ host: config.host, port: config.port });
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
