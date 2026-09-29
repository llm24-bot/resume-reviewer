import assert from "node:assert/strict";
import { test } from "node:test";
import {
  MAX_TEXT_LENGTH,
  splitReview,
  validateReviewInput,
  wordCount,
} from "../src/lib/review";
import { SAMPLE_JOB, SAMPLE_RESUME } from "../src/lib/sample";
import {
  BodyTooLargeError,
  createLimiter,
  matchesAccessCode,
  readBoundedJson,
} from "../src/lib/server-guards";

test("validation rejects missing, malformed and non-string documents", () => {
  for (const input of [
    null,
    [],
    {},
    "text",
    { resume: 42, jobDescription: "x".repeat(100) },
  ]) {
    assert.equal(validateReviewInput(input).ok, false);
  }
});
test("validation trims whitespace and enforces both boundaries", () => {
  assert.equal(
    validateReviewInput({ resume: " ".repeat(101), jobDescription: SAMPLE_JOB })
      .ok,
    false,
  );
  assert.equal(
    validateReviewInput({ resume: "r".repeat(99), jobDescription: SAMPLE_JOB })
      .ok,
    false,
  );
  assert.equal(
    validateReviewInput({
      resume: "r".repeat(100),
      jobDescription: "j".repeat(100),
    }).ok,
    true,
  );
  assert.equal(
    validateReviewInput({
      resume: "r".repeat(MAX_TEXT_LENGTH),
      jobDescription: SAMPLE_JOB,
    }).ok,
    true,
  );
  assert.equal(
    validateReviewInput({
      resume: "r".repeat(MAX_TEXT_LENGTH + 1),
      jobDescription: SAMPLE_JOB,
    }).ok,
    false,
  );
  const valid = validateReviewInput({
    resume: `  ${SAMPLE_RESUME}  `,
    jobDescription: SAMPLE_JOB,
  });
  assert.ok(valid.ok);
  assert.equal(valid.data.resume, SAMPLE_RESUME);
});
test("sections preserve unexpected or unstructured provider output", () => {
  assert.deepEqual(splitReview("Plain feedback"), [
    { title: "Overview", content: "Plain feedback" },
  ]);
  assert.deepEqual(splitReview("Intro\n## First\nOne\n## Second\nTwo"), [
    { title: "Overview", content: "Intro" },
    { title: "First", content: "One" },
    { title: "Second", content: "Two" },
  ]);
  assert.deepEqual(splitReview(""), []);
});
test("word counts handle empty and mixed whitespace", () => {
  assert.equal(wordCount(" \n "), 0);
  assert.equal(wordCount("one \n two\tthree"), 3);
});
test("access code comparison is exact", () => {
  assert.equal(matchesAccessCode("private-code", "private-code"), true);
  assert.equal(matchesAccessCode("private-code", "wrong"), false);
  assert.equal(matchesAccessCode("private-code", ""), false);
});
test("limiter enforces independent windows and recovers after expiration", () => {
  const limit = createLimiter(2, 1000);
  assert.equal(limit("a", 0).allowed, true);
  assert.equal(limit("a", 1).allowed, true);
  assert.deepEqual(limit("a", 2), { allowed: false, retryAfter: 1 });
  assert.equal(limit("b", 2).allowed, true);
  assert.equal(limit("a", 1001).allowed, true);
});
test("bounded JSON rejects declared and streamed oversized bodies", async () => {
  await assert.rejects(
    readBoundedJson(
      new Request("http://localhost", {
        method: "POST",
        headers: { "content-length": "999999" },
        body: "{}",
      }),
    ),
    BodyTooLargeError,
  );
  await assert.rejects(
    readBoundedJson(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ resume: "r".repeat(256_001) }),
      }),
    ),
    BodyTooLargeError,
  );
});
test("bounded JSON reads valid Unicode input and rejects broken JSON", async () => {
  assert.deepEqual(
    await readBoundedJson(
      new Request("http://localhost", {
        method: "POST",
        body: '{"text":"你好"}',
      }),
    ),
    { text: "你好" },
  );
  await assert.rejects(
    readBoundedJson(
      new Request("http://localhost", {
        method: "POST",
        body: "{oops",
      }),
    ),
    SyntaxError,
  );
});
