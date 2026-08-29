# Jato

An MCP (Model Context Protocol) server exposing a persistent note store over stdio.

## Quick start

```bash
npm install
npm run build
npm test
```

Then register it. The repo ships a `.mcp.json` that Claude Code picks up
automatically when you work in this directory; the server must be built first,
since it points at `dist/index.js`.

To register it elsewhere, or globally:

```bash
claude mcp add jato -- node /absolute/path/to/Jato/dist/index.js
```

Any MCP client works — the config shape is the usual `command` / `args` pair.

## Tools

| Tool | Purpose |
| --- | --- |
| `note_write` | Create a note, or overwrite an existing one with the same id |
| `note_read` | Fetch one note's full body and tags |
| `note_list` | List notes newest-first, optionally filtered to a tag |
| `note_search` | Case-insensitive substring search over ids, bodies and tags |
| `note_delete` | Permanently remove a note |

Note ids are free-form paths like `meetings/2026-08-standup`, so notes can be
organised hierarchically without the server needing a folder concept.

## Storage

Notes live in a single JSON file, by default `~/.jato-mcp/notes.json`. Set
`JATO_MCP_DATA_DIR` to relocate it — useful for keeping separate stores per
project, and what the test suite uses to stay off your real notes.

Writes go to a temp file and are then renamed over the target, so an
interrupted write cannot leave a partially serialised file behind. Operations
are serialised internally: clients are free to pipeline tool calls, and
overlapping read-modify-write cycles would otherwise drop notes.

Note that ordering between concurrently-issued calls is not guaranteed — if a
search must observe a write, await the write first.

## Layout

```
src/
  index.ts        entry point; stdio transport wiring only
  server.ts       server construction, kept transport-free so tests can
                  drive it over an in-memory pair
  schema.ts       Zod input shapes for every tool
  store.ts        persistence: load, flush, and the operation queue
  tools/
    index.ts      single place where tool groups are attached
    notes.ts      the note tools
  test/
    store.test.ts   persistence and concurrency
    server.test.ts  end-to-end over the real protocol
```

To add a capability, write a new module under `src/tools/` and register it in
`src/tools/index.ts` rather than growing `server.ts`.

## Scripts

| Script | Does |
| --- | --- |
| `npm run build` | Compile to `dist/` |
| `npm run typecheck` | Type-check without emitting |
| `npm test` | Build, then run the suite |
| `npm start` | Run the server on stdio |
