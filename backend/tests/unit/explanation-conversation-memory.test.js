const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildPrompt
} = require("../../src/services/ai.service");

const SOURCE =
  "Portfolio governance requires regular reviews.";

test("Explanation includes previous questions and answers", () => {
  const history =
    "Student: What should we improve?\n" +
    "Assistant: The framework needs formal stage gates.";

  const prompt = buildPrompt(
    SOURCE,
    "explanation",
    {
      concept: "Explain the recommendation from earlier.",
      level: "beginner",
      history
    }
  );

  assert.ok(prompt.includes(history));
  assert.ok(prompt.includes(SOURCE));
  assert.ok(
    prompt.includes("Explain the recommendation from earlier.")
  );
});

test("First-time explanations work without conversation history", () => {
  const prompt = buildPrompt(
    SOURCE,
    "explanation",
    {
      concept: "Explain governance",
      level: "beginner"
    }
  );

  assert.ok(prompt.includes(SOURCE));
  assert.ok(prompt.includes("Explain governance"));
  assert.ok(
    prompt.includes("No previous conversation messages.")
  );
});

test("Explanation history is limited to 6000 characters", () => {
  const prompt = buildPrompt(
    SOURCE,
    "explanation",
    {
      concept: "Summarise our discussion",
      level: "beginner",
      history: "Z".repeat(7000)
    }
  );

  assert.ok(prompt.includes("Z".repeat(6000)));
  assert.ok(!prompt.includes("Z".repeat(6001)));
});

test("Primary study material remains authoritative", () => {
  const prompt = buildPrompt(
    "PRIMARY STUDY MATERIAL\n---\n" +
    "Governance requires review gates.\n---\n\n" +
    "SUPPLEMENTARY CHAT MATERIAL\n" +
    "The project includes three initiatives.",
    "explanation",
    {
      concept: "Explain governance",
      level: "beginner",
      history: "Student: What are review gates?"
    }
  );

  assert.ok(prompt.includes("PRIMARY STUDY MATERIAL"));
  assert.ok(prompt.includes("SUPPLEMENTARY CHAT MATERIAL"));
  assert.ok(prompt.includes("Student: What are review gates?"));
  assert.ok(
    prompt.includes(
      "Treat previous answers as conversational context"
    )
  );
});

test("Summary does not receive explanation chat history", () => {
  const prompt = buildPrompt(
    SOURCE,
    "summary",
    {
      history: "PRIVATE_CONVERSATION_SENTINEL"
    }
  );

  assert.ok(prompt.includes(SOURCE));
  assert.ok(
    !prompt.includes("PRIVATE_CONVERSATION_SENTINEL")
  );
});
