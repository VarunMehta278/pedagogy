import test from "node:test";
import assert from "node:assert/strict";

import { rateLimit } from "../src/middleware/rateLimitMiddleware";

/*
 * Helper that drives the middleware the way Express would
 * and reports what it decided.
 */
function callLimiter(
  limiter: ReturnType<typeof rateLimit>,
  ip: string,
  path: string
) {
  let status = 200;
  let body: any = null;
  let passed = false;
  const headers: Record<string, string> = {};

  const req: any = { ip, path, socket: {} };

  const res: any = {
    setHeader(name: string, value: string) {
      headers[name] = value;
    },
    status(code: number) {
      status = code;
      return res;
    },
    json(payload: any) {
      body = payload;
      return res;
    },
  };

  limiter(req, res, () => {
    passed = true;
  });

  return { status, body, passed, headers };
}

test("allows requests up to the limit", () => {
  const limiter = rateLimit({ windowMs: 60_000, max: 3 });

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const result = callLimiter(
      limiter,
      "10.0.0.1",
      "/login"
    );

    assert.equal(
      result.passed,
      true,
      `attempt ${attempt} should pass`
    );
  }
});

test("blocks the request that exceeds the limit", () => {
  const limiter = rateLimit({ windowMs: 60_000, max: 2 });

  callLimiter(limiter, "10.0.0.2", "/login");
  callLimiter(limiter, "10.0.0.2", "/login");

  const blocked = callLimiter(
    limiter,
    "10.0.0.2",
    "/login"
  );

  assert.equal(blocked.passed, false);
  assert.equal(blocked.status, 429);
  assert.equal(blocked.body.success, false);
});

test("sends a Retry-After header when blocking", () => {
  const limiter = rateLimit({ windowMs: 60_000, max: 1 });

  callLimiter(limiter, "10.0.0.3", "/login");

  const blocked = callLimiter(
    limiter,
    "10.0.0.3",
    "/login"
  );

  assert.ok(
    Number(blocked.headers["Retry-After"]) > 0,
    "Retry-After should be a positive number of seconds"
  );
});

test("counts each IP separately", () => {
  const limiter = rateLimit({ windowMs: 60_000, max: 1 });

  callLimiter(limiter, "10.0.0.4", "/login");

  const other = callLimiter(
    limiter,
    "10.0.0.5",
    "/login"
  );

  assert.equal(
    other.passed,
    true,
    "one IP hitting the limit must not lock out another"
  );
});

test("counts each route separately", () => {
  const limiter = rateLimit({ windowMs: 60_000, max: 1 });

  callLimiter(limiter, "10.0.0.6", "/login");

  const other = callLimiter(
    limiter,
    "10.0.0.6",
    "/register"
  );

  assert.equal(
    other.passed,
    true,
    "exhausting login must not also block registration"
  );
});

test("lets requests through again once the window passes", async () => {
  const limiter = rateLimit({ windowMs: 40, max: 1 });

  callLimiter(limiter, "10.0.0.7", "/login");

  const blocked = callLimiter(
    limiter,
    "10.0.0.7",
    "/login"
  );

  assert.equal(blocked.passed, false);

  await new Promise((resolve) =>
    setTimeout(resolve, 60)
  );

  const afterWindow = callLimiter(
    limiter,
    "10.0.0.7",
    "/login"
  );

  assert.equal(afterWindow.passed, true);
});

test("falls back to the socket address when req.ip is absent", () => {
  const limiter = rateLimit({ windowMs: 60_000, max: 1 });

  let passed = false;

  const req: any = {
    path: "/login",
    socket: { remoteAddress: "10.0.0.8" },
  };

  const res: any = {
    setHeader() {},
    status() {
      return res;
    },
    json() {
      return res;
    },
  };

  limiter(req, res, () => {
    passed = true;
  });

  assert.equal(passed, true);
});
