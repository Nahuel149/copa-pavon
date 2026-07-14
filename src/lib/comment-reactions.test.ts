import { describe, expect, it } from "vitest";
import { emptyTablaCommentReactions, normalizeTablaCommentReactions } from "./comment-reactions";

describe("comment reactions", () => {
  it("starts every supported reaction at zero", () => {
    expect(emptyTablaCommentReactions()).toEqual({ "😍": 0, "😂": 0, "🤑": 0, "👍": 0, "😢": 0, "😡": 0 });
  });

  it("keeps supported non-negative counters and ignores invalid data", () => {
    expect(normalizeTablaCommentReactions({ "😍": 3.8, "😂": -1, custom: 9, "😡": "2" })).toEqual({
      "😍": 3,
      "😂": 0,
      "🤑": 0,
      "👍": 0,
      "😢": 0,
      "😡": 0,
    });
  });
});
