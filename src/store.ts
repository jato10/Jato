import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

/** A single stored note. */
export interface Note {
  id: string;
  body: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

/** Raised when an operation targets a note that does not exist. */
export class NoteNotFoundError extends Error {
  constructor(public readonly id: string) {
    super(`No note with id "${id}"`);
    this.name = "NoteNotFoundError";
  }
}

/** Resolve the on-disk location of the note file. */
export function defaultDataFile(): string {
  const dir = process.env["JATO_MCP_DATA_DIR"] ?? join(homedir(), ".jato-mcp");
  return join(dir, "notes.json");
}

/**
 * A note store persisted as a single JSON file.
 *
 * Reads are served from an in-memory map that is loaded lazily on first use.
 * Writes are flushed immediately via a temp-file rename so a crash mid-write
 * cannot leave a partially serialised file behind.
 */
export class NoteStore {
  /**
   * The in-flight or completed load. Caching the *promise* rather than the
   * resolved map means concurrent callers share one read; caching the map
   * would let two callers both observe `null`, each build a separate map,
   * and have the loser's map silently replace the winner's.
   */
  private loaded: Promise<Map<string, Note>> | null = null;

  /** Tail of the operation queue; see `run`. */
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly file: string = defaultDataFile()) {}

  /**
   * Serialise operations. Every mutation is a read-modify-write over shared
   * state, so letting two of them interleave can drop a note; clients are
   * free to pipeline tool calls, so this is reachable in normal use.
   */
  private run<T>(fn: () => Promise<T>): Promise<T> {
    const result = this.queue.then(fn, fn);
    // Keep the chain alive even when an operation rejects.
    this.queue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  private load(): Promise<Map<string, Note>> {
    if (!this.loaded) {
      this.loaded = (async () => {
        let parsed: Note[] = [];
        try {
          parsed = JSON.parse(await readFile(this.file, "utf8")) as Note[];
        } catch (err) {
          // A missing file is the normal first-run case; anything else is real.
          if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
        }
        return new Map(parsed.map((n) => [n.id, n]));
      })().catch((err: unknown) => {
        // Don't cache a failure - let the next call retry the read.
        this.loaded = null;
        throw err;
      });
    }
    return this.loaded;
  }

  private async flush(notes: Map<string, Note>): Promise<void> {
    await mkdir(dirname(this.file), { recursive: true });
    const tmp = `${this.file}.${process.pid}.tmp`;
    await writeFile(tmp, JSON.stringify([...notes.values()], null, 2), "utf8");
    await rename(tmp, this.file);
  }

  /** Create a note, or replace the body/tags of an existing one. */
  async write(id: string, body: string, tags: string[] = []): Promise<Note> {
    return this.run(async () => {
      const notes = await this.load();
      const now = new Date().toISOString();
      const existing = notes.get(id);
      const note: Note = {
        id,
        body,
        tags,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
      notes.set(id, note);
      await this.flush(notes);
      return note;
    });
  }

  async read(id: string): Promise<Note> {
    return this.run(async () => {
      const note = (await this.load()).get(id);
      if (!note) throw new NoteNotFoundError(id);
      return note;
    });
  }

  /** All notes, newest update first. Optionally narrowed to one tag. */
  async list(tag?: string): Promise<Note[]> {
    return this.run(async () => {
      const all = [...(await this.load()).values()];
      const filtered = tag ? all.filter((n) => n.tags.includes(tag)) : all;
      return filtered.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    });
  }

  async delete(id: string): Promise<void> {
    return this.run(async () => {
      const notes = await this.load();
      if (!notes.delete(id)) throw new NoteNotFoundError(id);
      await this.flush(notes);
    });
  }

  /** Case-insensitive substring match over note ids, bodies and tags. */
  async search(query: string): Promise<Note[]> {
    const q = query.toLowerCase();
    const hits = (await this.list()).filter(
      (n) =>
        n.id.toLowerCase().includes(q) ||
        n.body.toLowerCase().includes(q) ||
        n.tags.some((t) => t.toLowerCase().includes(q)),
    );
    return hits;
  }
}
