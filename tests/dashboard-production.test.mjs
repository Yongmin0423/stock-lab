import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { setTimeout } from "node:timers/promises";

// Requires a production build and a configured DB; reads public pages only.
const deployedOrigin = process.argv[2];
const port = 3219;
const origin = deployedOrigin ?? `http://127.0.0.1:${port}`;
for (let restart = 0; restart < (deployedOrigin ? 1 : 2); restart++) {
  const server = deployedOrigin ? null : spawn(process.execPath, [
    "node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port),
  ], { env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" }, stdio: "ignore" });
  try {
    if (server) {
      let ready = false;
      for (let attempt = 0; attempt < 60; attempt++) {
        assert.equal(server.exitCode, null, "Production server must start");
        try {
          const response = await fetch(`${origin}/login`, { signal: AbortSignal.timeout(2000) });
          await response.text();
          if (response.ok) { ready = true; break; }
        } catch { /* Wait for the server to start. */ }
        await setTimeout(250);
      }
      assert.ok(ready, "Production server must become ready");
    }
    for (let attempt = 0; attempt < 3; attempt++) {
      const started = performance.now();
      const response = await fetch(`${origin}/?loading-check=${restart}-${attempt}`, {
        signal: AbortSignal.timeout(60000),
      });
      assert.equal(response.status, 200);
      const html = await response.text();
      assert.ok(html.includes("Watchlist"), "A 200 shell alone is not a completed dashboard");
      console.log(`Dashboard restart ${restart + 1}, request ${attempt + 1}: ${Math.round(performance.now() - started)}ms, complete body`);
    }
  } finally {
    if (server) {
      const exited = new Promise((resolve) => server.once("exit", resolve));
      server.kill("SIGTERM");
      await exited;
    }
  }
}
