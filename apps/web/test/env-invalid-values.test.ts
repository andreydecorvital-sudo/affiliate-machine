import assert from "node:assert/strict";
import test from "node:test";
import { getServerEnv } from "../src/lib/env";

test("malformed optional integrations do not crash environment parsing", () => {
  const previous = {
    appUrl: process.env.NEXT_PUBLIC_APP_URL,
    password: process.env.APP_ACCESS_PASSWORD,
    metaVersion: process.env.META_GRAPH_API_VERSION,
    gate: process.env.META_ADS_WRITE_ENABLED
  };

  try {
    process.env.NEXT_PUBLIC_APP_URL = "not-a-url";
    process.env.APP_ACCESS_PASSWORD = "short";
    process.env.META_GRAPH_API_VERSION = "latest";
    process.env.META_ADS_WRITE_ENABLED = "true";

    const env = getServerEnv();

    assert.equal(env.NEXT_PUBLIC_APP_URL, undefined);
    assert.equal(env.APP_ACCESS_PASSWORD, undefined);
    assert.equal(env.META_GRAPH_API_VERSION, undefined);
    assert.equal(env.META_ADS_WRITE_ENABLED, "0");
  } finally {
    if (previous.appUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
    else process.env.NEXT_PUBLIC_APP_URL = previous.appUrl;

    if (previous.password === undefined) delete process.env.APP_ACCESS_PASSWORD;
    else process.env.APP_ACCESS_PASSWORD = previous.password;

    if (previous.metaVersion === undefined) delete process.env.META_GRAPH_API_VERSION;
    else process.env.META_GRAPH_API_VERSION = previous.metaVersion;

    if (previous.gate === undefined) delete process.env.META_ADS_WRITE_ENABLED;
    else process.env.META_ADS_WRITE_ENABLED = previous.gate;
  }
});
