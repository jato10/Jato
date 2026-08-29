#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { createServer } from "./server.js";

async function main(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stdout is the protocol channel, so anything human-facing goes to stderr.
  process.stderr.write("jato-mcp listening on stdio\n");
}

main().catch((err: unknown) => {
  process.stderr.write(`jato-mcp failed to start: ${String(err)}\n`);
  process.exit(1);
});
