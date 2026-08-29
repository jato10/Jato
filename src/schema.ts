import { z } from "zod";

/**
 * Input shapes for every tool the server exposes.
 *
 * These are plain Zod raw shapes (not wrapped in `z.object`) because that is
 * what `McpServer.registerTool` expects for `inputSchema`; the SDK converts
 * them to JSON Schema when it advertises the tool.
 */

const noteId = z
  .string()
  .min(1, "id must not be empty")
  .max(128, "id must be 128 characters or fewer")
  .regex(
    /^[A-Za-z0-9][A-Za-z0-9._/-]*$/,
    "id must start alphanumeric and contain only letters, digits, dot, dash, underscore or slash",
  )
  .describe("Unique identifier for the note, e.g. \"meetings/2026-08-standup\"");

const tag = z.string().min(1).max(64);

export const noteWriteShape = {
  id: noteId,
  body: z.string().max(100_000).describe("Full text of the note; replaces any existing body"),
  tags: z.array(tag).max(32).optional().describe("Optional labels used for filtering"),
};

export const noteReadShape = {
  id: noteId,
};

export const noteListShape = {
  tag: tag.optional().describe("If given, only return notes carrying this tag"),
};

export const noteDeleteShape = {
  id: noteId,
};

export const noteSearchShape = {
  query: z
    .string()
    .min(1)
    .describe("Case-insensitive substring matched against note ids, bodies and tags"),
};
