const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildPrompt
} = require("../../src/services/ai.service");

const MATERIAL = [
  "Portfolio governance defines roles and decision rights.",
  "Stage gates review project readiness and risk.",
  "Portfolio reviews assess strategic alignment.",
  "Resource constraints can affect project priorities."
].join(" ");

const makePrompt = (level) =>
  buildPrompt(MATERIAL, "quiz", { level });

test("Quiz beginner difficulty focuses on foundational knowledge", () => {
  const prompt = makePrompt("beginner");

  assert.match(prompt, /BEGINNER/);
  assert.match(prompt, /foundational concepts/);
  assert.match(prompt, /straightforward understanding/);
  assert.match(prompt, /simple|direct questions/i);
  assert.ok(prompt.includes(MATERIAL));
});

test("Quiz intermediate difficulty focuses on practical application", () => {
  const prompt = makePrompt("intermediate");

  assert.match(prompt, /INTERMEDIATE/);
  assert.match(prompt, /practical situations/);
  assert.match(prompt, /cause-and-effect reasoning/);
  assert.match(prompt, /understanding and application/);
  assert.ok(prompt.includes(MATERIAL));
});

test("Quiz advanced difficulty focuses on analysis and trade-offs", () => {
  const prompt = makePrompt("advanced");

  assert.match(prompt, /ADVANCED/);
  assert.match(prompt, /analytical reasoning/);
  assert.match(prompt, /trade-offs/);
  assert.match(prompt, /multiple facts or principles/);
  assert.match(prompt, /Do not invent facts/);
  assert.ok(prompt.includes(MATERIAL));
});

test("Quiz difficulty produces three distinct prompts", () => {
  const beginner = makePrompt("beginner");
  const intermediate = makePrompt("intermediate");
  const advanced = makePrompt("advanced");

  assert.notEqual(beginner, intermediate);
  assert.notEqual(intermediate, advanced);
  assert.notEqual(beginner, advanced);
});

test("Quiz defaults to intermediate when no difficulty is provided", () => {
  const defaultPrompt = buildPrompt(MATERIAL, "quiz");
  const intermediate = makePrompt("intermediate");

  assert.equal(defaultPrompt, intermediate);
});

test("Quiz rejects unsupported difficulty values", () => {
  for (const level of ["expert", "easy", "hard", "BEGINNER"]) {
    assert.throws(
      () => makePrompt(level),
      { code: "INVALID_LEVEL" }
    );
  }
});

test("Quiz retains existing question and answer format instructions", () => {
  for (const level of ["beginner", "intermediate", "advanced"]) {
    const prompt = makePrompt(level);

    assert.match(prompt, /multiple-choice and true\/false/);
    assert.match(prompt, /exactly 4 options/);
    assert.match(prompt, /correct_answer/);
    assert.match(prompt, /between 5 and 10 questions/);
    assert.match(prompt, /Use only information present in the material/);
  }
});