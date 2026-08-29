import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";

import { NoteNotFoundError, NoteStore } from "../store.js";

let dir: string;
const newStore = () => new NoteStore(join(dir, "notes.json"));

before(async () => {
  dir = await mkdtemp(join(tmpdir(), "jato-store-"));
});
after(async () => {
  await rm(dir, { recursive: true, force: true });
});

test("write then read round-trips a note", async () => {
  const store = newStore();
  await store.write("alpha", "first body", ["x"]);
  const note = await store.read("alpha");
  assert.equal(note.body, "first body");
  assert.deepEqual(note.tags, ["x"]);
});

test("data survives a fresh store instance", async () => {
  await newStore().write("persisted", "still here");
  assert.equal((await newStore().read("persisted")).body, "still here");
});

test("rewriting keeps createdAt but moves updatedAt", async () => {
  const store = newStore();
  const first = await store.write("beta", "v1");
  await new Promise((r) => setTimeout(r, 5));
  const second = await store.write("beta", "v2");
  assert.equal(second.createdAt, first.createdAt);
  assert.equal(second.body, "v2");
  assert.ok(second.updatedAt >= first.updatedAt);
});

test("reading a missing note throws NoteNotFoundError", async () => {
  await assert.rejects(() => newStore().read("nope"), NoteNotFoundError);
});

test("deleting a missing note throws NoteNotFoundError", async () => {
  await assert.rejects(() => newStore().delete("nope"), NoteNotFoundError);
});

test("list filters by tag", async () => {
  const store = newStore();
  await store.write("t1", "body", ["keep"]);
  await store.write("t2", "body", ["drop"]);
  const kept = await store.list("keep");
  assert.deepEqual(kept.map((n) => n.id), ["t1"]);
});

test("search matches id, body and tags case-insensitively", async () => {
  const store = newStore();
  await store.write("searchable-id", "nothing special", ["Tagged"]);
  assert.equal((await store.search("SEARCHABLE")).length, 1);
  assert.equal((await store.search("SPECIAL")).length, 1);
  assert.equal((await store.search("tagged")).length, 1);
  assert.equal((await store.search("absent-term")).length, 0);
});

test("delete removes the note", async () => {
  const store = newStore();
  await store.write("gone", "body");
  await store.delete("gone");
  await assert.rejects(() => store.read("gone"), NoteNotFoundError);
});

test("a read racing a write does not destroy the written note", async () => {
  const file = join(dir, "race.json");
  const store = new NoteStore(file);

  // A pipelining client issues both without awaiting the first. This used to
  // leave the store holding an empty map while the note sat on disk.
  await Promise.all([store.write("first", "important data"), store.list()]);

  // The old bug only surfaced here: this flush wrote the stale empty map,
  // silently dropping "first".
  await store.write("second", "more data");

  const onDisk = await new NoteStore(file).list();
  assert.deepEqual(onDisk.map((n) => n.id).sort(), ["first", "second"]);
});

test("concurrent writes all survive", async () => {
  const store = new NoteStore(join(dir, "concurrent.json"));
  const ids = Array.from({ length: 25 }, (_, i) => `n${i}`);
  await Promise.all(ids.map((id) => store.write(id, `body ${id}`)));

  // Re-read from disk to prove the flushes did not overwrite each other.
  const reloaded = await new NoteStore(join(dir, "concurrent.json")).list();
  assert.deepEqual(reloaded.map((n) => n.id).sort(), [...ids].sort());
});

test("a failed load is not cached", async () => {
  const bad = join(dir, "corrupt.json");
  await writeFile(bad, "{ not json", "utf8");
  const store = new NoteStore(bad);
  await assert.rejects(() => store.list());
  // Repair the file; the store must retry rather than serve a cached failure.
  await writeFile(bad, "[]", "utf8");
  assert.deepEqual(await store.list(), []);
});
