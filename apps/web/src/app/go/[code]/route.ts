import { NextRequest, NextResponse } from "next/server";
import { recordClick, resolveShortLink } from "@/lib/attribution/short-links";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  const { code } = await context.params;
  const safeCode = code.trim();

  if (!/^[A-Za-z0-9]{6,16}$/.test(safeCode)) {
    return NextResponse.json({ error: "invalid_link" }, { status: 404 });
  }

  const link = await resolveShortLink(safeCode);
  if (!link) {
    return NextResponse.json({ error: "link_not_found" }, { status: 404 });
  }

  try {
    await recordClick({
      shortLinkId: link.id,
      referrer: request.headers.get("referer"),
      userAgent: request.headers.get("user-agent")
    });
  } catch {
    // Click analytics must never block monetization redirect.
  }

  const response = NextResponse.redirect(link.destinationUrl, 302);
  response.headers.set("Cache-Control", "no-store, private");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
