import type { Plugin } from "vitest/config";

const PACKAGE = "vitest-supermock";
const HELPER = "mockModule";
const FACTORY = "mockAllExports";

type Node = { type: string; [key: string]: unknown };
type Parse = (code: string) => unknown;

/**
 * Rewrites a test file so that each `mockModule(binding)` mocks the module `binding` was imported from.
 * Returns `undefined` when the file has nothing to rewrite.
 *
 * Vitest only hoists `vi.mock` / `vitest.mock` calls above the imports of a file. For every call this
 * appends `vitest.mock("<source>", async () => (await import("vitest-supermock")).mockAllExports())`;
 * Vitest's own transform then hoists that line and turns the static imports into dynamic ones. Appending
 * keeps every original line in place, so the file's source map stays valid.
 */
export const transform = (code: string, id: string, parse: Parse): string | undefined => {
  if (!code.includes(PACKAGE)) return;

  const ast = parse(code) as { body: Node[] };
  const imports = new Map<string, { source: string; imported: string }>();

  for (const node of ast.body) {
    if (node.type !== "ImportDeclaration") continue;

    const source = (node.source as { value: string }).value;
    for (const specifier of node.specifiers as Node[]) {
      imports.set((specifier.local as { name: string }).name, { source, imported: importedName(specifier) });
    }
  }

  const helper = [...imports].find(([, binding]) => binding.source === PACKAGE && binding.imported === HELPER);
  if (!helper) return;
  const [helperLocal] = helper;

  const mockedSources = new Set<string>();
  walk(ast, (node) => {
    if (node.type !== "CallExpression") return;

    const callee = node.callee as Node;
    if (callee.type !== "Identifier" || callee.name !== helperLocal) return;

    const [argument] = node.arguments as Node[];
    const binding = argument?.type === "Identifier" ? imports.get(argument.name as string) : undefined;
    if (!binding) {
      throw new Error(
        `${HELPER}() only accepts a binding from an import statement, e.g. ${HELPER}(router). Check ${id}`,
      );
    }

    mockedSources.add(binding.source);
  });
  if (mockedSources.size === 0) return;

  // Vitest only recognises the call when the object is literally named `vi` or `vitest`.
  const vitestLocal = ["vi", "vitest"].find((name) => imports.get(name)?.source === "vitest");
  const appended = vitestLocal ? [] : [`import { vitest } from "vitest";`];
  for (const source of mockedSources) {
    appended.push(
      `${vitestLocal ?? "vitest"}.mock(${JSON.stringify(source)}, async () => (await import(${JSON.stringify(PACKAGE)})).${FACTORY}());`,
    );
  }

  return `${code}${code.endsWith("\n") ? "" : "\n"}${appended.join("\n")}\n`;
};

/** Vite plugin that makes `mockModule(binding)` from "vitest-supermock" work. Add it to `plugins` in your Vitest config. */
export const supermock = (): Plugin => ({
  name: PACKAGE,
  transform(code, id) {
    if (id.includes("/node_modules/")) return;

    const transformed = transform(code, id, (source) => this.parse(source));

    return transformed === undefined ? undefined : { code: transformed, map: null };
  },
});

const importedName = (specifier: Node): string => {
  if (specifier.type === "ImportDefaultSpecifier") return "default";
  if (specifier.type === "ImportNamespaceSpecifier") return "*";

  const imported = specifier.imported as { name?: string; value?: string };

  return imported.name ?? String(imported.value);
};

const walk = (node: unknown, visit: (node: Node) => void): void => {
  if (Array.isArray(node)) {
    for (const child of node) walk(child, visit);
    return;
  }
  if (!node || typeof node !== "object" || !("type" in node)) return;

  visit(node as Node);
  for (const child of Object.values(node)) walk(child, visit);
};
