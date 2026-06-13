// Unit tests for the pure validation helpers. Run with:
//   deno test supabase/functions/_shared/validation.test.ts
import {
  assertEquals,
  assertThrows,
} from "jsr:@std/assert@1";
import {
  isE164Phone,
  optionalString,
  requireEnum,
  requireIsoDate,
  requireNonNegativeInteger,
  requireObject,
  requirePhone,
  requirePositiveNumber,
  requireString,
  requireUuid,
  ValidationError,
} from "./validation.ts";

const UUID = "11111111-1111-4111-8111-111111111111";

Deno.test("requireObject accepts plain objects, rejects others", () => {
  assertEquals(requireObject({ a: 1 }), { a: 1 });
  assertThrows(() => requireObject(null), ValidationError);
  assertThrows(() => requireObject([1, 2]), ValidationError);
  assertThrows(() => requireObject("x"), ValidationError);
});

Deno.test("requireString trims and enforces bounds", () => {
  assertEquals(requireString({ name: "  hi  " }, "name"), "hi");
  assertThrows(() => requireString({}, "name"), ValidationError);
  assertThrows(() => requireString({ name: "" }, "name"), ValidationError);
  assertThrows(
    () => requireString({ name: "abcdef" }, "name", { max: 3 }),
    ValidationError,
  );
});

Deno.test("optionalString returns null for empty/missing", () => {
  assertEquals(optionalString({}, "x"), null);
  assertEquals(optionalString({ x: "" }, "x"), null);
  assertEquals(optionalString({ x: "  v " }, "x"), "v");
  assertThrows(() => optionalString({ x: 5 }, "x"), ValidationError);
});

Deno.test("requireUuid validates UUID format", () => {
  assertEquals(requireUuid({ id: UUID }, "id"), UUID);
  assertThrows(() => requireUuid({ id: "not-a-uuid" }, "id"), ValidationError);
});

Deno.test("requirePositiveNumber accepts numeric strings and rejects <= 0", () => {
  assertEquals(requirePositiveNumber({ a: 12.5 }, "a"), 12.5);
  assertEquals(requirePositiveNumber({ a: "30" }, "a"), 30);
  assertThrows(() => requirePositiveNumber({ a: 0 }, "a"), ValidationError);
  assertThrows(() => requirePositiveNumber({ a: -1 }, "a"), ValidationError);
});

Deno.test("requireNonNegativeInteger honors fallback and rejects bad values", () => {
  assertEquals(requireNonNegativeInteger({}, "g", 0), 0);
  assertEquals(requireNonNegativeInteger({ g: 5 }, "g"), 5);
  assertThrows(() => requireNonNegativeInteger({ g: -1 }, "g"), ValidationError);
  assertThrows(() => requireNonNegativeInteger({ g: 1.5 }, "g"), ValidationError);
});

Deno.test("requireEnum enforces allowed set", () => {
  assertEquals(requireEnum({ t: "income" }, "t", ["income", "expense"]), "income");
  assertThrows(
    () => requireEnum({ t: "other" }, "t", ["income", "expense"]),
    ValidationError,
  );
});

Deno.test("requireIsoDate validates YYYY-MM-DD", () => {
  assertEquals(requireIsoDate({ d: "2026-06-12" }, "d"), "2026-06-12");
  assertThrows(() => requireIsoDate({ d: "12/06/2026" }, "d"), ValidationError);
  assertThrows(() => requireIsoDate({ d: "2026-13-40" }, "d"), ValidationError);
});

Deno.test("isE164Phone / requirePhone", () => {
  assertEquals(isE164Phone("+919876543210"), true);
  assertEquals(isE164Phone("9876543210"), false);
  assertEquals(requirePhone({ p: "+919876543210" }, "p"), "+919876543210");
  assertThrows(() => requirePhone({ p: "12345" }, "p"), ValidationError);
});
