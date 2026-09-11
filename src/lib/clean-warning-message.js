/**
 * Server warning/blocking text is written for a support ticket, not this
 * screen - it embeds the raw uploaded filename (with its upload UUID),
 * quotes technical identifiers (crm/type/version), and dumps the full
 * enumerated column list inline (down to a "+N more" or "…" tail). Strip
 * that down to the plain sentence for display; a code we haven't
 * special-cased still degrades to a readable sentence instead of a wall
 * of text.
 */
export function cleanWarningMessage(message) {
  const withoutTechnicalTokens = message
    .replace(/"[^"]*\.(csv|xlsx)"/gi, 'this file')
    .replace(/"([a-zA-Z][\w-]*)"/g, '$1')
    .replace(/\s*\(v\d+\)/gi, '');

  const sentences = withoutTechnicalTokens.split(/(?<=\.)\s+/);
  const cleanedSentences = sentences.map((sentence) => {
    const colonIndex = sentence.indexOf(':');
    if (colonIndex === -1) return sentence;
    const afterColon = sentence.slice(colonIndex + 1);
    // A colon introducing an enumerated list, not just a clause - multiple
    // comma-separated items, "field → field" mappings, or a truncated tail.
    const looksLikeList =
      (afterColon.match(/,/g)?.length ?? 0) >= 2 ||
      /→/.test(afterColon) ||
      /\bmore\b/.test(afterColon) ||
      /…/.test(afterColon);
    if (!looksLikeList) return sentence;
    return `${sentence.slice(0, colonIndex).trim()}.`;
  });

  const cleaned = cleanedSentences.join(' ').replace(/\s{2,}/g, ' ').trim();
  // The filename replacement ("this file") can land at the very start of
  // the sentence - capitalize it rather than leaving a lowercase opener.
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}
