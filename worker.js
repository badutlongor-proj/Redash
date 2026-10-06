import { createServer } from "node:http";
import { httpServerHandler } from "cloudflare:node";
import app from "./server.js";

const server = createServer(app);

server.listen(3000);

export default httpServerHandler({ port: 3000 });
