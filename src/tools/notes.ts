import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import {
  noteDeleteShape,
  noteListShape,
  noteReadShape,
  noteSearchShape,
  noteWriteShape,
} from "../schema.js";
import { type Note, type NoteStore } from "../store.js";

function text(body: string): CallToolResult {
  return { content: [{ type: "text", text: body }] };
}

function failure(err: unknown): CallToolResult {
  const message = err instanceof Error ? err.message : String(err);
  return { content: [{ type: "text", text: message }], isError: true };
}

/**
 * Wrap a handler so an unexpected throw becomes a tool-level error result
 * rather than a protocol-level fault that tears down the client's call.
 */
function guard<A extends unknown[]>(
  fn: (...args: A) => Promise<CallToolResult>,
): (...args: A) => Promise<CallToolResult> {
  return async (...args: A) => {
    try {
      return await fn(...args);
    } catch (err) {
      return failure(err);
    }
  };
}

function render(note: Note): string {
  const tags = note.tags.length ? ` [${note.tags.join(", ")}]` : "";
  return `${note.id}${tags} (updated ${note.updatedAt})\n${note.body}`;
}

function summarise(notes: Note[], empty: string): CallToolResult {
  if (notes.length === 0) return text(empty);
  const lines = notes.map((n) => {
    const tags = n.tags.length ? ` [${n.tags.join(", ")}]` : "";
    return `${n.id}${tags} — ${n.body.split("\n")[0]?.slice(0, 80) ?? ""}`;
  });
  return text(`${notes.length} note(s):\n${lines.join("\n")}`);
}

/** Register the note tools against a store. */
export function registerNoteTools(server: McpServer, store: NoteStore): void {
  server.registerTool(
    "note_write",
    {
      title: "Write note",
      description:
        "Create a note or overwrite an existing one with the same id. Returns the stored note.",
      inputSchema: noteWriteShape,
      annotations: { readOnlyHint: false, idempotentHint: true },
    },
    guard(async ({ id, body, tags }) => {
      const note = await store.write(id, body, tags ?? []);
      return text(`Saved.\n${render(note)}`);
    }),
  );

  server.registerTool(
    "note_read",
    {
      title: "Read note",
      description: "Fetch the full body and tags of a single note by id.",
      inputSchema: noteReadShape,
      annotations: { readOnlyHint: true },
    },
    guard(async ({ id }) => text(render(await store.read(id)))),
  );

  server.registerTool(
    "note_list",
    {
      title: "List notes",
      description:
        "List stored notes newest-first, optionally narrowed to a single tag. Bodies are truncated.",
      inputSchema: noteListShape,
      annotations: { readOnlyHint: true },
    },
    guard(async ({ tag }) =>
      summarise(await store.list(tag), tag ? `No notes tagged "${tag}".` : "No notes stored."),
    ),
  );

  server.registerTool(
    "note_delete",
    {
      title: "Delete note",
      description: "Permanently remove a note by id.",
      inputSchema: noteDeleteShape,
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
    },
    guard(async ({ id }) => {
      await store.delete(id);
      return text(`Deleted "${id}".`);
    }),
  );

  server.registerTool(
    "note_search",
    {
      title: "Search notes",
      description: "Case-insensitive substring search across note ids, bodies and tags.",
      inputSchema: noteSearchShape,
      annotations: { readOnlyHint: true },
    },
    guard(async ({ query }) =>
      summarise(await store.search(query), `Nothing matched "${query}".`),
    ),
  );
}
