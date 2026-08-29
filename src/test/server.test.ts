import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

import { createServer } from "../server.js";
import { NoteStore } from "../store.js";

let dir: string;
let client: Client;

before(async () => {
  dir = await mkdtemp(join(tmpdir(), "jato-server-"));
  const server = createServer({ store: new NoteStore(join(dir, "notes.json")) });
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  client = new Client({ name: "test-client", version: "0.0.0" });
  await Promise.all([server.connect(serverSide), client.connect(clientSide)]);
});

after(async () => {
  await client.close();
  await rm(dir, { recursive: true, force: true });
});

/** Pull the first text block out of a tool result. */
function firstText(result: unknown): string {
  const content = (result as { content: { type: string; text?: string }[] }).content;
  return content.find((c) => c.type === "text")?.text ?? "";
}

test("advertises every note tool", async () => {
  const names = (await client.listTools()).tools.map((t) => t.name).sort();
  assert.deepEqual(names, [
    "note_delete",
    "note_list",
    "note_read",
    "note_search",
    "note_write",
  ]);
});

test("write and read through the protocol", async () => {
  await client.callTool({
    name: "note_write",
    arguments: { id: "hello", body: "world", tags: ["greeting"] },
  });
  const read = await client.callTool({ name: "note_read", arguments: { id: "hello" } });
  assert.match(firstText(read), /world/);
  assert.match(firstText(read), /greeting/);
});

test("reading a missing note is a tool error, not a transport fault", async () => {
  const result = await client.callTool({ name: "note_read", arguments: { id: "missing" } });
  assert.equal((result as { isError?: boolean }).isError, true);
  assert.match(firstText(result), /No note with id/);
});

test("an invalid id is rejected by schema validation", async () => {
  const result = await client.callTool({
    name: "note_write",
    arguments: { id: "-bad-start", body: "x" },
  });
  assert.equal((result as { isError?: boolean }).isError, true);
});

test("list reports an empty tag cleanly", async () => {
  const result = await client.callTool({ name: "note_list", arguments: { tag: "unused" } });
  assert.match(firstText(result), /No notes tagged/);
});

test("search finds a written note", async () => {
  await client.callTool({ name: "note_write", arguments: { id: "findme", body: "needle here" } });
  const result = await client.callTool({ name: "note_search", arguments: { query: "needle" } });
  assert.match(firstText(result), /findme/);
});

test("delete removes a note", async () => {
  await client.callTool({ name: "note_write", arguments: { id: "temp", body: "x" } });
  await client.callTool({ name: "note_delete", arguments: { id: "temp" } });
  const read = await client.callTool({ name: "note_read", arguments: { id: "temp" } });
  assert.equal((read as { isError?: boolean }).isError, true);
});
