import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const MONEY_CYCLE_URL = Deno.env.get("MONEY_CYCLE_URL") || "";
const INTERNAL_JOB_SECRET = Deno.env.get("INTERNAL_JOB_SECRET") || "";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store"
    }
  });
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405);
  }

  if (!MONEY_CYCLE_URL || !INTERNAL_JOB_SECRET) {
    return json(
      {
        error: "money_cycle_not_configured",
        missing: [
          ...(!MONEY_CYCLE_URL ? ["MONEY_CYCLE_URL"] : []),
          ...(!INTERNAL_JOB_SECRET ? ["INTERNAL_JOB_SECRET"] : [])
        ]
      },
      503
    );
  }

  const input = await req.json().catch(() => ({}));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 280_000);

  try {
    const response = await fetch(MONEY_CYCLE_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${INTERNAL_JOB_SECRET}`,
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(input ?? {})
    });

    const text = await response.text();
    let body: unknown = null;

    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = { raw: text.slice(0, 2000) };
    }

    return json(
      {
        ok: response.ok || response.status === 207,
        upstreamStatus: response.status,
        result: body
      },
      response.ok || response.status === 207 ? 200 : 502
    );
  } catch (error) {
    return json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      },
      502
    );
  } finally {
    clearTimeout(timeout);
  }
});
