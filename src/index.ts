import { mockDeep, mockFn, type CalledWithMock, type DeepMockProxy } from "vitest-mock-extended";

/**
 * What `mockModule()` returns. A function export gains the mock function API of vitest-mock-extended;
 * an object export becomes a deep mock whose members are mocked on first access.
 */
export type Mocked<Exported> = Exported extends (...args: infer Args) => infer Result
  ? Exported & CalledWithMock<Result, Args>
  : DeepMockProxy<Exported>;

// Names a module namespace must not answer to: `then` would make `import()` treat it as a promise.
const NOT_EXPORTS = new Set<PropertyKey>(["then", "__esModule"]);
// Own properties every function has. They are not mock API, so a mocked object may read and overwrite them.
const FUNCTION_INTRINSICS = new Set<PropertyKey>(["name", "length", "prototype", "arguments", "caller"]);

const installed = new WeakSet<object>();

/**
 * One mocked export. It is a callable mock function, so a function export works, and it hands out deep
 * mocks for every other property, so an object export works too.
 */
const mockExport = (): object => {
  const callable = mockFn();
  const members: Record<PropertyKey, unknown> = mockDeep({ funcPropSupport: true });
  const isMockApi = (key: PropertyKey) => key in callable && !FUNCTION_INTRINSICS.has(key);

  const exported = new Proxy(callable, {
    get: (target, key) => {
      if (isMockApi(key)) return Reflect.get(target, key);
      if (typeof key !== "string" || key === "then") return undefined;

      return members[key];
    },
    set: (target, key, value) => {
      if (isMockApi(key)) return Reflect.set(target, key, value);

      members[key] = value;

      return true;
    },
  });
  installed.add(exported);

  return exported;
};

/**
 * Builds a module namespace whose exports are mocked on first access. The plugin passes this as the
 * `vi.mock` factory for every module you call `mockModule()` on; you normally never call it yourself.
 */
export const mockAllExports = (): Record<string, unknown> => {
  const exports: Record<string, object> = {};

  return new Proxy(exports, {
    get: (target, key) => (typeof key !== "string" || NOT_EXPORTS.has(key) ? undefined : (target[key] ??= mockExport())),
    // Vitest checks `name in module` before it reads an export from a mocked module.
    has: (_, key) => typeof key === "string" && !NOT_EXPORTS.has(key),
  });
};

/**
 * Returns `exported` typed as its mock. The plugin has already replaced the module it was imported from,
 * so at runtime the import is the mock. This narrows the type and fails loudly if the plugin did not run.
 */
export const mockModule = <Exported>(exported: Exported): Mocked<Exported> => {
  if (!installed.has(exported as object)) {
    throw new Error(
      "mockModule(): this value is not mocked. Pass a binding from an import statement and add supermock() " +
        'from "vitest-supermock/plugin" to the plugins of your Vitest config.',
    );
  }

  return exported as Mocked<Exported>;
};
