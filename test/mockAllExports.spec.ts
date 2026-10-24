import { describe, expect, it } from "vitest";
import { mockAllExports } from "vitest-supermock";

type Exports = Record<string, any>;

describe("mockAllExports", () => {
  it("creates an export on first read and keeps returning the same one", () => {
    const module: Exports = mockAllExports();

    expect(module.router).toBe(module.router);
    expect(module.router).not.toBe(module.users);
  });

  it("reports every name as exported, which Vitest checks before reading a mocked export", () => {
    expect("anything" in mockAllExports()).toBe(true);
  });

  it("is not a thenable and not a CommonJS namespace", () => {
    const module: Exports = mockAllExports();

    expect(module.then).toBeUndefined();
    expect(module.__esModule).toBeUndefined();
  });

  it("mocks a function export as a callable mock function", () => {
    const module: Exports = mockAllExports();
    module.fetchUser.mockReturnValue({ id: 1 });

    expect(module.fetchUser("1")).toEqual({ id: 1 });
    expect(module.fetchUser).toHaveBeenCalledWith("1");
  });

  it("mocks the methods of an object export on access", async () => {
    const module: Exports = mockAllExports();
    module.repository.save.mockResolvedValue(42);

    await expect(module.repository.save({ id: 1 })).resolves.toBe(42);
    expect(module.repository.save).toHaveBeenCalledWith({ id: 1 });
  });

  it("lets a test assign plain values, including names a function already has", () => {
    const module: Exports = mockAllExports();
    module.config.name = "app";
    module.config.length = 3;
    module.config.retries = 2;

    expect(module.config.name).toBe("app");
    expect(module.config.length).toBe(3);
    expect(module.config.retries).toBe(2);
  });
});
