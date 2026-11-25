/**
 * Words a shortened line must not end on: "... Throw Blanket by...",
 * "... worked through Cubism in…". Shared by the SEO descriptions (seo.ts)
 * and the artist notes (artistShops.ts).
 */
export const DANGLING_END =
  /\s+(?:&|a|an|and|as|at|by|for|from|in|of|on|or|the|to|with)$/i;
