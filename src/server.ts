import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { NoteStore } from "./store.js";
import { registerAllTools } from "./tools/index.js";

export const SERVER_NAME = "jato-mcp";
export const SERVER_VERSION = "0.1.0";

export interface CreateServerOptions {
  /** Override the store, primarily so tests can use a temp directory. */
  store?: NoteStore;
}

/**
 * Build a fully configured server. Kept free of transport concerns so tests
 * can drive it over an in-memory pair instead of stdio.
 */
export function createServer(options: CreateServerOptions = {}): McpServer {
  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { capabilities: { tools: {} } },
  );
  registerAllTools(server, options.store ?? new NoteStore());
  return server;
}
