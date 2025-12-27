export interface TermMatch {
  term: string;
  index: number;
  length: number;
}

export function buildTermPattern(terms: string[]): RegExp | null {
  if (!terms || terms.length === 0) return null;

  const escapedTerms = terms
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .sort((a, b) => b.length - a.length);

  return new RegExp(`\\b(${escapedTerms.join("|")})\\b`, "gi");
}

export function findTermMatches(text: string, terms: string[]): TermMatch[] {
  const pattern = buildTermPattern(terms);
  if (!pattern) return [];

  const matches: TermMatch[] = [];
  let match: RegExpExecArray | null;

  pattern.lastIndex = 0;

  while ((match = pattern.exec(text)) !== null) {
    matches.push({
      term: match[0],
      index: match.index,
      length: match[0].length,
    });
  }

  return matches;
}

export function detectTermsInText(
  text: string,
  terms: { term: string; id: number }[],
): { term: string; id: number }[] {
  const sortedTerms = [...terms].sort((a, b) => b.term.length - a.term.length);
  const found: { term: string; id: number }[] = [];
  const textLower = text.toLowerCase();

  for (const termObj of sortedTerms) {
    const termLower = termObj.term.toLowerCase();
    const escapedTerm = termLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b${escapedTerm}\\b`, "i");

    if (regex.test(text)) {
      const alreadyFound = found.some(
        (f) =>
          f.term.toLowerCase().includes(termLower) ||
          termLower.includes(f.term.toLowerCase()),
      );

      if (!alreadyFound) {
        found.push(termObj);
      }
    }
  }

  return found;
}
