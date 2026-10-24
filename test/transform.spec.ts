import { parseAst } from "vite";
import { describe, expect, it } from "vitest";

import { transform } from "../src/plugin.ts";

const FILE = "/project/test/example.spec.ts";
const run = (code: string) => transform(code, FILE, (source) => parseAst(source));
const lines = (...sourceLines: string[]) => `${sourceLines.join("\n")}\n`;

describe("transform", () => {
  it("appends a hoistable vitest.mock for the module each binding was imported from", () => {
    const code = lines(
      'import { supermock } from "vitest-supermock";',
      'import { router } from "./router";',
      'import { users } from "@/users";',
      "const routerMock = supermock(router);",
      "const usersMock = supermock(users);",
    );

    expect(run(code)).toBe(
      code +
        lines(
          'import { vitest } from "vitest";',
          'vitest.mock("./router", async () => (await import("vitest-supermock")).mockAllExports());',
          'vitest.mock("@/users", async () => (await import("vitest-supermock")).mockAllExports());',
        ),
    );
  });

  it("mocks a module once when several of its exports are passed", () => {
    const code = lines(
      'import { supermock } from "vitest-supermock";',
      'import { save, load } from "./storage";',
      "supermock(save);",
      "supermock(load);",
    );

    expect(run(code)?.match(/vitest\.mock\(/g)).toHaveLength(1);
  });

  it("reuses `vi` when the file already imports it from vitest", () => {
    const code = lines(
      'import { vi } from "vitest";',
      'import { supermock } from "vitest-supermock";',
      'import { router } from "./router";',
      "supermock(router);",
    );

    expect(run(code)).toBe(
      code + lines('vi.mock("./router", async () => (await import("vitest-supermock")).mockAllExports());'),
    );
  });

  it("follows an import alias of supermock", () => {
    const code = lines(
      'import { supermock as mocked } from "vitest-supermock";',
      'import { router } from "./router";',
      "mocked(router);",
    );

    expect(run(code)).toContain('vitest.mock("./router"');
  });

  it("supports default and namespace imports", () => {
    const code = lines(
      'import { supermock } from "vitest-supermock";',
      'import config from "./config";',
      'import * as api from "./api";',
      "supermock(config);",
      "supermock(api);",
    );

    expect(run(code)).toContain('vitest.mock("./config"');
    expect(run(code)).toContain('vitest.mock("./api"');
  });

  it("leaves files alone that do not import supermock from vitest-supermock", () => {
    expect(run(lines('import { router } from "./router";', "router.navigateTo();"))).toBeUndefined();
    expect(run(lines('import { supermock } from "./helpers";', "supermock(router);"))).toBeUndefined();
  });

  it("leaves files alone that import supermock but never call it", () => {
    expect(run(lines('import { supermock } from "vitest-supermock";', 'console.log("supermock(");'))).toBeUndefined();
  });

  it("rejects an argument that is not an import binding", () => {
    const code = lines(
      'import { supermock } from "vitest-supermock";',
      "const router = { navigateTo: () => {} };",
      "supermock(router);",
    );

    expect(() => run(code)).toThrow(`supermock() only accepts a binding from an import statement, e.g. supermock(router). Check ${FILE}`);
  });
});
