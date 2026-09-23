import { NextRequest, NextResponse } from "next/server";
import {
  isAllowedWhatsAppInviteUrl,
  routeAcquisitionVisit
} from "@/lib/acquisition/router";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ niche: string }> }
) {
  const { niche } = await context.params;
  const search = request.nextUrl.searchParams;

  try {
    const result = await routeAcquisitionVisit({
      niche,
      utmSource: search.get("utm_source"),
      utmMedium: search.get("utm_medium"),
      utmCampaign: search.get("utm_campaign"),
      utmContent: search.get("utm_content"),
      utmTerm: search.get("utm_term"),
      referrer: request.headers.get("referer"),
      userAgent: request.headers.get("user-agent")
    });

    if (!result.inviteUrl || !isAllowedWhatsAppInviteUrl(result.inviteUrl)) {
      return new NextResponse(
        "Nenhum grupo disponível para este nicho agora.",
        {
          status: 503,
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-store"
          }
        }
      );
    }

    const response = NextResponse.redirect(result.inviteUrl, 302);
    response.headers.set("Cache-Control", "no-store, private");
    response.headers.set("X-Acquisition-Visit", result.visitId ?? "");
    return response;
  } catch {
    return new NextResponse(
      "Não foi possível direcionar para o grupo agora.",
      {
        status: 503,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-store"
        }
      }
    );
  }
}
