import { describe, expect, it, vi } from "vitest";
import { supermock } from "vitest-supermock";

import { farewell, greeter } from "./fixtures/greeter";
import { isFormal, leave, welcome } from "./fixtures/service";

const greeterMock = supermock(greeter);
const farewellMock = supermock(farewell);

describe("supermock", () => {
  it("hands back the import itself, already replaced by the plugin", () => {
    expect(greeterMock).toBe(greeter);
    expect(farewellMock).toBe(farewell);
  });

  it("mocked functions return undefined until told otherwise", () => {
    expect(greeterMock.greet("Ada")).toBeUndefined();
    expect(farewellMock("Ada")).toBeUndefined();
  });

  it("replaces an object export before the code under test imports it", () => {
    greeterMock.greet.mockReturnValueOnce("hi");

    expect(welcome("Ada")).toBe("HI");
    expect(greeterMock.greet).toHaveBeenCalledWith("Ada");
  });

  it("replaces a function export with a callable mock function", () => {
    farewellMock.mockReturnValueOnce("bye");

    expect(leave("Ada")).toBe("BYE");
    expect(vi.isMockFunction(farewellMock)).toBe(true);
    expect(farewellMock).toHaveBeenCalledWith("Ada");
  });

  it("mocks nested members on first access", () => {
    greeterMock.settings.tone.formal.mockReturnValueOnce(true);

    expect(isFormal()).toBe(true);
  });

  it("keeps the calledWith API of vitest-mock-extended", () => {
    greeterMock.greet.calledWith("Bob").mockReturnValue("yo");
    farewellMock.calledWith("Bob").mockReturnValue("later");

    expect(welcome("Bob")).toBe("YO");
    expect(leave("Bob")).toBe("LATER");
  });

  it("throws for a value the plugin did not mock", () => {
    // A direct `supermock(...)` call would be rewritten by the plugin; an alias is not.
    const typed = supermock;

    expect(() => typed({ greet: () => "" })).toThrow(/not mocked/);
  });
});
