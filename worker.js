import { createServer } from "node:http";
import { httpServerHandler } from "cloudflare:node";
import app from "./server.js";

const server = createServer(app);

export default httpServerHandler(server);
