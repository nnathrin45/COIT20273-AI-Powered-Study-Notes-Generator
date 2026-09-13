/*
 * The 60-second request timeout (T-23, NFR5).
 *
 * ai.service races every Gemini request against a timer and rejects with
 * AI_TIMEOUT if the timer wins, so a student is never left waiting on a request
 * that will not return. Until now only the tail of that path was covered: an
 * existing test confirms an error already carrying AI_TIMEOUT survives
 * classification. The race itself had never executed.
 *
 * It could not be tested while the timeout was a fixed 60 s constant, because
 * no real call has ever taken that long and no suite can afford to wait a
 * minute for one. `raceAgainstTimeout` accepts the duration as an argument, so
 * the same code path runs here in a few milliseconds against a stubbed request
 * that never settles. No Gemini call, no quota (risk R3).
 */

const test = require("node:test");
const assert = require("node:assert");

const { raceAgainstTimeout, REQUEST_TIMEOUT_MS } = require("../../src/services/ai.service");

// Stands in for a Gemini request that never comes back
const neverSettles = () => new Promise(() => {});

test("a request that does not return in time is rejected as AI_TIMEOUT (T-23)", async () => {
  const started = Date.now();

  await assert.rejects(
    () => raceAgainstTimeout(neverSettles(), 20),
    (error) => {
      assert.strictEqual(error.code, "AI_TIMEOUT");
      assert.match(error.message, /timed out/i);
      return true;
    }
  );

  // Confirms the rejection came from the timer rather than from the request
  // failing for some other reason
  assert.ok(
    Date.now() - started >= 20,
    "should not reject before the timeout has elapsed"
  );
});

test("a request that returns in time is unaffected by the timeout (T-23)", async () => {
  const response = await raceAgainstTimeout(Promise.resolve({ text: "a summary" }), 1000);

  assert.deepStrictEqual(response, { text: "a summary" });
});

test("a request failing on its own merits keeps its own error (T-23)", async () => {
  // The timer must not mask a genuine upstream failure by turning every
  // rejection into a timeout
  const upstream = new Error("rate limited");
  upstream.status = 429;

  await assert.rejects(
    () => raceAgainstTimeout(Promise.reject(upstream), 1000),
    (error) => {
      assert.strictEqual(error.status, 429);
      assert.strictEqual(error.code, undefined, "should not be relabelled as a timeout");
      return true;
    }
  );
});

test("the production timeout is 60 seconds unless configured otherwise (NFR5)", () => {
  // Guards the default: the test suite overrides the duration per call, so a
  // change to the constant would otherwise go unnoticed.
  assert.strictEqual(
    REQUEST_TIMEOUT_MS,
    Number(process.env.AI_REQUEST_TIMEOUT_MS) || 60000
  );
});

test("the timeout timer does not outlive the race (T-23)", async () => {
  // A timer left pending holds the event loop open for the remainder of the
  // timeout. With a 60 s default that would stall the suite on every run.
  const before = process.getActiveResourcesInfo().filter((r) => r === "Timeout").length;

  await raceAgainstTimeout(Promise.resolve("done"), 60000);

  const after = process.getActiveResourcesInfo().filter((r) => r === "Timeout").length;

  assert.strictEqual(after, before, "the timeout should be cleared once the race settles");
});
