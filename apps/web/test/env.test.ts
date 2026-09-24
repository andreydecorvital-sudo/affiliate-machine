import assert from "node:assert/strict";
import test from "node:test";
import { getServerEnv } from "../src/lib/env";

test("empty optional Vercel variables are treated as missing", () => {
  const previous = {
    appUrl: process.env.NEXT_PUBLIC_APP_URL,
    password: process.env.APP_ACCESS_PASSWORD,
    autopilot: process.env.AUTOPILOT_ENABLED
  };

  try {
    process.env.NEXT_PUBLIC_APP_URL = "";
    process.env.APP_ACCESS_PASSWORD = "   ";
    process.env.AUTOPILOT_ENABLED = "";

    const env = getServerEnv();

    assert.equal(env.NEXT_PUBLIC_APP_URL, undefined);
    assert.equal(env.APP_ACCESS_PASSWORD, undefined);
    assert.equal(env.AUTOPILOT_ENABLED, "0");
  } finally {
    if (previous.appUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
    else process.env.NEXT_PUBLIC_APP_URL = previous.appUrl;

    if (previous.password === undefined) delete process.env.APP_ACCESS_PASSWORD;
    else process.env.APP_ACCESS_PASSWORD = previous.password;

    if (previous.autopilot === undefined) delete process.env.AUTOPILOT_ENABLED;
    else process.env.AUTOPILOT_ENABLED = previous.autopilot;
  }
});
