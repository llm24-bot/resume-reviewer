import assert from "node:assert/strict";
import { test, beforeEach, afterEach } from "node:test";
import { GET, POST } from "../src/app/api/review/route";
import { SAMPLE_JOB, SAMPLE_RESUME } from "../src/lib/sample";

const savedEnv = { ...process.env };
let requestNumber = 0;
beforeEach(() => {
  Object.assign(process.env, { NODE_ENV: "development", VERCEL: "1" });
  delete process.env.REVIEW_ACCESS_CODE;
  delete process.env.ANTHROPIC_API_KEY;
});
afterEach(() => {
  for (const key of [
    "NODE_ENV",
    "VERCEL",
    "REVIEW_ACCESS_CODE",
    "ANTHROPIC_API_KEY",
  ]) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
});
function request(
  body: unknown = { resume: SAMPLE_RESUME, jobDescription: SAMPLE_JOB },
  headers: Record<string, string> = {},
) {
  return new Request("http://localhost/api/review", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-vercel-forwarded-for": `test-client-${++requestNumber}`,
      ...headers,
    },
    body: JSON.stringify(body),
  });
}
test("status endpoint exposes only capability flags", async () => {
  const response = await GET();
  assert.deepEqual(await response.json(), {
    available: false,
    accessRequired: false,
  });
  assert.equal(response.headers.get("cache-control"), "no-store");
});
test("production fails closed without a private access code", async () => {
  Object.assign(process.env, {
    NODE_ENV: "production",
    ANTHROPIC_API_KEY: "test-placeholder",
  });
  assert.equal((await POST(request())).status, 503);
  assert.equal((await (await GET()).json()).available, false);
});
test("access code must match when configured", async () => {
  process.env.REVIEW_ACCESS_CODE = "test-private-code";
  assert.equal((await POST(request())).status, 401);
  assert.equal(
    (await POST(request(undefined, { "x-review-access-code": "wrong" })))
      .status,
    401,
  );
});
test("rejects cross-origin and non-JSON requests before any model call", async () => {
  assert.equal(
    (await POST(request(undefined, { origin: "https://other.example" })))
      .status,
    403,
  );
  assert.equal(
    (await POST(request(undefined, { "content-type": "text/plain" }))).status,
    415,
  );
});
test("invalid documents and oversized bodies are rejected", async () => {
  assert.equal(
    (await POST(request({ resume: "short", jobDescription: "" }))).status,
    400,
  );
  assert.equal(
    (await POST(request(undefined, { "content-length": "999999" }))).status,
    413,
  );
});
test("missing key returns a recoverable configuration error with original copy", async () => {
  const response = await POST(request());
  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /because Louis is dumb/);
});
test("valid request reaches a mocked provider and returns normalized feedback", async (t) => {
  process.env.ANTHROPIC_API_KEY = "test-placeholder";
  let calls = 0;
  t.mock.method(
    globalThis,
    "fetch",
    async (_url: unknown, options: RequestInit) => {
      calls++;
      const payload = JSON.parse(String(options.body));
      assert.match(payload.system, /untrusted data/);
      assert.equal(
        JSON.parse(payload.messages[0].content).resume,
        SAMPLE_RESUME,
      );
      return Response.json({
        id: "test-message",
        type: "message",
        role: "assistant",
        model: "test",
        content: [
          {
            type: "text",
            text: "## Top three improvements\nYour résumé needs clearer bullets.",
          },
        ],
        stop_reason: "end_turn",
        usage: { input_tokens: 1, output_tokens: 1 },
      });
    },
  );
  const response = await POST(request());
  assert.equal(response.status, 200);
  assert.match((await response.json()).review, /Your resume/);
  assert.equal(calls, 1);
});
test("truncated model output is not presented as a completed review", async (t) => {
  process.env.ANTHROPIC_API_KEY = "test-placeholder";
  t.mock.method(globalThis, "fetch", async () =>
    Response.json({
      id: "test-message",
      type: "message",
      role: "assistant",
      content: [{ type: "text", text: "Partial" }],
      stop_reason: "max_tokens",
      usage: { input_tokens: 1, output_tokens: 1 },
    }),
  );
  assert.equal((await POST(request())).status, 502);
});
test("provider errors are sanitized and keep the user wording", async (t) => {
  process.env.ANTHROPIC_API_KEY = "test-placeholder";
  t.mock.method(globalThis, "fetch", async () =>
    Response.json(
      {
        error: {
          type: "authentication_error",
          message: "private provider diagnostic",
        },
      },
      { status: 401 },
    ),
  );
  const response = await POST(request());
  assert.equal(response.status, 502);
  const text = JSON.stringify(await response.json());
  assert.match(text, /Call Louis/);
  assert.doesNotMatch(text, /private provider diagnostic/);
});
