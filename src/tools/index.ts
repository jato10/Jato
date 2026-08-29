import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import type { NoteStore } from "../store.js";
import { registerNoteTools } from "./notes.js";

/**
 * Single place where every tool group is attached to the server.
 * New capabilities should get their own module here rather than growing
 * `server.ts`.
 */
export function registerAllTools(server: McpServer, store: NoteStore): void {
  registerNoteTools(server, store);
}
