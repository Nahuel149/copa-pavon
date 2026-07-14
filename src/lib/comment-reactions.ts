export const tablaReactionEmojis = ["😍", "😂", "🤑", "👍", "😢", "😡"] as const;

export type TablaReactionEmoji = (typeof tablaReactionEmojis)[number];
export type TablaCommentReactions = Record<TablaReactionEmoji, number>;

export function emptyTablaCommentReactions(): TablaCommentReactions {
  return Object.fromEntries(tablaReactionEmojis.map((emoji) => [emoji, 0])) as TablaCommentReactions;
}

export function normalizeTablaCommentReactions(value: unknown): TablaCommentReactions {
  const source = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const reactions = emptyTablaCommentReactions();

  for (const emoji of tablaReactionEmojis) {
    const count = source[emoji];
    reactions[emoji] = typeof count === "number" && Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
  }

  return reactions;
}
