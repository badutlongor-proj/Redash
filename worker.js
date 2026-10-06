import app from "./server.js";
import { httpServerHandler } from "cloudflare:node";

export default httpServerHandler({
  port: 3000,
  defaultPort: 3000,
  handler: app
});
