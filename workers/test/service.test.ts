import { describe, expect, it } from "vitest";

import type { ShoppingList } from "../src/llm/structText";
import { fallbackIfEmpty } from "../src/service";

const emptyList = (): ShoppingList => ({
  groceries: [],
  consumables: [],
  tools: [],
  furniture: [],
});

describe("fallbackIfEmpty", () => {
  it("registers the utterance to tools when all categories are empty", () => {
    expect(fallbackIfEmpty(emptyList(), " スポンジボブ ")).toEqual({
      ...emptyList(),
      tools: ["スポンジボブ"],
    });
  });

  it("keeps the list as is when some item exists", () => {
    const list = { ...emptyList(), groceries: ["牛乳"] };
    expect(fallbackIfEmpty(list, "牛乳")).toEqual(list);
  });

  it("keeps the list empty when the utterance is blank", () => {
    expect(fallbackIfEmpty(emptyList(), "  ")).toEqual(emptyList());
  });
});
