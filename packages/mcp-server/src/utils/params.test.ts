import { parseOptionalNonNegativeInteger } from "./params";

describe("parseOptionalNonNegativeInteger", () => {
  it("returns undefined for nullish values", () => {
    expect(parseOptionalNonNegativeInteger(undefined, "derivationIndex")).toBeUndefined();
    expect(parseOptionalNonNegativeInteger(null, "derivationIndex")).toBeUndefined();
  });

  it("accepts numeric values", () => {
    expect(parseOptionalNonNegativeInteger(0, "derivationIndex")).toBe(0);
    expect(parseOptionalNonNegativeInteger(7, "derivationIndex")).toBe(7);
  });

  it("accepts numeric strings", () => {
    expect(parseOptionalNonNegativeInteger("0", "derivationIndex")).toBe(0);
    expect(parseOptionalNonNegativeInteger("42", "derivationIndex")).toBe(42);
    expect(parseOptionalNonNegativeInteger(" 9 ", "derivationIndex")).toBe(9);
  });

  it("rejects non-integer and negative values", () => {
    expect(() => parseOptionalNonNegativeInteger("-1", "derivationIndex")).toThrow(
      "derivationIndex must be a non-negative integer",
    );
    expect(() => parseOptionalNonNegativeInteger(0.5, "derivationIndex")).toThrow(
      "derivationIndex must be a non-negative integer",
    );
    expect(() => parseOptionalNonNegativeInteger("abc", "derivationIndex")).toThrow(
      "derivationIndex must be a non-negative integer",
    );
  });
});
