# vitest-supermock

Mock a module in Vitest from a regular import.

```ts
import { mockModule } from "vitest-supermock";
import { router } from "./router";
import { signUp } from "./signUp";

const routerMock = mockModule(router);

it("redirects after signing up", async () => {
  await signUp({ email: "ada@example.com" });

  expect(routerMock.navigateTo).toHaveBeenCalledWith("/welcome");
});
```

That is the whole API. No `vi.mock` factory, no `vi.mocked` cast, no `await import` of the code under test. Imports stay static, at the top of the file, and `routerMock.navigateTo.mockReturnValue(...)` type-checks because `routerMock` carries the [vitest-mock-extended](https://github.com/eratio08/vitest-mock-extended) types.

## Install

```sh
pnpm add -D vitest-supermock
```

Vitest 4 or newer is a peer dependency. The test suite runs against Vitest 5.

## Setup

Add the plugin to your Vitest config.

```ts
import { defineConfig } from "vitest/config";
import { supermock } from "vitest-supermock/plugin";

export default defineConfig({
  plugins: [supermock()],
});
```

## Usage

Pass any binding from an import statement. The whole module it comes from gets mocked, and you get that export back, typed as its mock.

```ts
import { mockModule } from "vitest-supermock";
import { usersRepository } from "./usersRepository";
import { sendEmail } from "./email";

const usersRepositoryMock = mockModule(usersRepository);
const sendEmailMock = mockModule(sendEmail);

usersRepositoryMock.save.mockResolvedValue(42);
sendEmailMock.calledWith("ada@example.com").mockResolvedValue(true);
```

Object exports behave like `mockDeep()` from vitest-mock-extended, so `usersRepositoryMock.save` and `clientMock.auth.token` exist the moment you read them. Function exports are callable mock functions with the usual `mockReturnValue`, `mock.calls` and `calledWith`. Every mocked function returns `undefined` until you say otherwise. Nothing calls through to the real implementation.

## How it works

`vi.mock` works because Vitest rewrites the test file. It moves every `vi.mock` call to the top and turns every static import into a dynamic one that runs after the mocks are registered. Anything that is not literally `vi.mock`, `vitest.mock` or `vi.hoisted` stays where it is, which is why a plain helper function cannot do this on its own.

The plugin runs before Vitest's rewrite. For each `mockModule(binding)` it finds the import statement that declares `binding` and appends one line to the file:

```ts
vitest.mock("./router", async () => (await import("vitest-supermock")).mockAllExports());
```

Vitest hoists that line as usual. `mockAllExports()` returns a module whose exports are created on first access. Because the plugin only appends, every original line keeps its number and stack traces still point at your code.

At runtime `mockModule(router)` returns its argument. The import already is the mock by then. It only narrows the type and throws if the module was not replaced, which is what you see when the plugin is missing from the config.

## Rules

- The argument has to be a binding from an import statement in the same file. `mockModule(someLocalObject)` fails at transform time with a message naming the file.
- Call it as `mockModule(...)`. Renaming it in the import statement is fine, assigning it to a variable first is not, because the plugin looks for the call by name.
- Property names that a mock function already has, such as `mock`, `mockReturnValue` or `calledWith`, resolve to the mock function API. Plain assignment still works for the rest, including `name` and `length`.

## License

MIT
