import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

import { supermock } from "./src/plugin.ts";

export default defineConfig({
  plugins: [supermock()],
  resolve: {
    // The package's own tests import "vitest-supermock" the way users do; point that at the sources.
    alias: { "vitest-supermock": fileURLToPath(new URL("./src/index.ts", import.meta.url)) },
  },
  test: {
    include: ["test/**/*.spec.ts"],
  },
});
