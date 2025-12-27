import {
  buildTermPattern,
  findTermMatches,
  detectTermsInText,
} from "../lib/cooking-terms-regex";

describe("buildTermPattern", () => {
  it("returns null for empty array", () => {
    expect(buildTermPattern([])).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(buildTermPattern(undefined as any)).toBeNull();
  });

  it("creates a valid regex for single term", () => {
    const pattern = buildTermPattern(["dice"]);
    expect(pattern).toBeInstanceOf(RegExp);
    expect(pattern?.test("I will dice the vegetables")).toBe(true);
  });

  it("creates a regex that matches multiple terms", () => {
    const pattern = buildTermPattern(["simmer", "dice", "blanch"]);
    expect(pattern).toBeInstanceOf(RegExp);

    pattern!.lastIndex = 0;
    expect(pattern?.test("Dice the onions")).toBe(true);

    pattern!.lastIndex = 0;
    expect(pattern?.test("Blanch the spinach")).toBe(true);

    pattern!.lastIndex = 0;
    expect(pattern?.test("Simmer with butter")).toBe(true);
  });

  it("escapes special regex characters", () => {
    const pattern = buildTermPattern(["al dente"]);
    expect(pattern).toBeInstanceOf(RegExp);
    expect(pattern?.test("Cook until al dente")).toBe(true);
  });
});

describe("findTermMatches", () => {
  it("finds a single term in text", () => {
    const matches = findTermMatches("Dice the vegetables", ["dice"]);
    expect(matches).toHaveLength(1);
    expect(matches[0].term.toLowerCase()).toBe("dice");
    expect(matches[0].index).toBe(0);
  });

  it("finds multiple different terms", () => {
    const text = "Dice the onions and blanch them gently";
    const matches = findTermMatches(text, ["dice", "blanch"]);
    expect(matches).toHaveLength(2);
    expect(matches.map((m) => m.term.toLowerCase())).toContain("dice");
    expect(matches.map((m) => m.term.toLowerCase())).toContain("blanch");
  });

  it("is case insensitive", () => {
    const matches = findTermMatches("DICE the veggies", ["dice"]);
    expect(matches).toHaveLength(1);
  });

  it("respects word boundaries - does not match partial words", () => {
    const matches = findTermMatches("The dicing was perfect", ["dice"]);
    expect(matches).toHaveLength(0);
  });

  it("respects word boundaries - matches whole words", () => {
    const matches = findTermMatches("Dice it finely", ["dice"]);
    expect(matches).toHaveLength(1);
    expect(matches[0].term.toLowerCase()).toBe("dice");
  });

  it("matches longer terms first (sorted by length)", () => {
    const text = "Use a julienne cut for the carrots";
    const terms = ["cut", "julienne cut", "julienne"];
    const pattern = buildTermPattern(terms);

    expect(pattern?.source).toMatch(/julienne cut.*\|.*julienne.*\|.*cut/i);
  });

  it("finds multiple instances of same term", () => {
    const text = "Dice the onions, then dice the peppers too";
    const matches = findTermMatches(text, ["dice"]);
    expect(matches).toHaveLength(2);
  });

  it("returns empty array for no matches", () => {
    const matches = findTermMatches("Boil water", ["simmer", "dice"]);
    expect(matches).toHaveLength(0);
  });

  it("returns empty array for empty terms list", () => {
    const matches = findTermMatches("Simmer vegetables", []);
    expect(matches).toHaveLength(0);
  });
});

describe("detectTermsInText", () => {
  const sampleTerms = [
    { term: "simmer", id: 1 },
    { term: "dice", id: 2 },
    { term: "blanch", id: 3 },
    { term: "julienne", id: 4 },
    { term: "julienne cut", id: 5 },
  ];

  it("detects terms present in text", () => {
    const text = "First, dice the vegetables then blanch them";
    const found = detectTermsInText(text, sampleTerms);
    expect(found.map((f) => f.term)).toContain("dice");
    expect(found.map((f) => f.term)).toContain("blanch");
  });

  it("is case insensitive", () => {
    const text = "BLANCH the spinach";
    const found = detectTermsInText(text, sampleTerms);
    expect(found).toHaveLength(1);
    expect(found[0].term).toBe("blanch");
  });

  it("handles longer terms matching first", () => {
    const text = "Use a julienne cut technique";
    const found = detectTermsInText(text, sampleTerms);
    const termNames = found.map((f) => f.term);
    expect(termNames).toContain("julienne cut");
  });

  it("returns empty array when no terms match", () => {
    const text = "Just boil the pasta";
    const found = detectTermsInText(text, sampleTerms);
    expect(found).toHaveLength(0);
  });

  it("handles empty text", () => {
    const found = detectTermsInText("", sampleTerms);
    expect(found).toHaveLength(0);
  });

  it("handles empty terms array", () => {
    const found = detectTermsInText("Simmer vegetables", []);
    expect(found).toHaveLength(0);
  });
});
