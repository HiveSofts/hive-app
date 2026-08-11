import { describe, expect, it } from "vitest";

import { cn } from "./utils";

describe("cn", () => {
    it("joins class strings", () => {
        expect(cn("foo", "bar")).toBe("foo bar");
    });

    it("filters out falsy values", () => {
        expect(cn("foo", undefined, null, false, "bar")).toBe("foo bar");
    });

    it("merges conflicting tailwind classes (last wins)", () => {
        expect(cn("p-4", "p-2")).toBe("p-2");
        expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
    });

    it("accepts conditional-object and array inputs", () => {
        expect(cn({ foo: true, bar: false }, ["baz"])).toBe("foo baz");
    });
});
