const test = require("node:test");
const assert = require("node:assert/strict");

const { buildPrompt } = require("../../src/services/ai.service");

const material =
  "Portfolio governance defines decision authority. " +
  "Risk management evaluates exposure. " +
  "Capacity management balances available resources.";

const prompt = (level) =>
  buildPrompt(material, "flashcards", { level });

test("Beginner flashcards focus on basic knowledge", () => {
  const result = prompt("beginner");
  assert.match(result, /BEGINNER/);
  assert.match(result, /fundamental terminology/);
});

test("Intermediate flashcards focus on application", () => {
  const result = prompt("intermediate");
  assert.match(result, /INTERMEDIATE/);
  assert.match(result, /practical situations/);
});

test("Advanced flashcards focus on analysis", () => {
  const result = prompt("advanced");
  assert.match(result, /ADVANCED/);
  assert.match(result, /trade-offs/);
  assert.match(result, /connect multiple concepts/);
});

test("All difficulty prompts are distinct", () => {
  assert.notEqual(prompt("beginner"), prompt("intermediate"));
  assert.notEqual(prompt("intermediate"), prompt("advanced"));
  assert.notEqual(prompt("beginner"), prompt("advanced"));
});

test("Intermediate default and invalid-level rejection", () => {
  assert.equal(
    buildPrompt(material, "flashcards"),
    prompt("intermediate")
  );

  assert.throws(
    () => prompt("expert"),
    { code: "INVALID_LEVEL" }
  );
});

test("Original flashcard format and source rules remain", () => {
  for (const level of ["beginner", "intermediate", "advanced"]) {
    const result = prompt(level);

    assert.match(result, /Use only information present/);
    assert.match(result, /one concise answer per card/);
    assert.match(result, /between 5 and 15 cards/);
    assert.match(result, /"cards"/);
    assert.ok(result.includes(material));
  }
});