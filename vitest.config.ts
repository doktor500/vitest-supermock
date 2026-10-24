import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

import { supermockPlugin } from "./src/plugin.ts";

export default defineConfig({
  plugins: [supermockPlugin()],
  resolve: {
    // The package's own tests import "vitest-supermock" the way users do; point that at the sources.
    alias: { "vitest-supermock": fileURLToPath(new URL("./src/index.ts", import.meta.url)) },
  },
  test: {
    include: ["test/**/*.spec.ts"],
  },
});
