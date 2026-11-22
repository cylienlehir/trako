import { NextRequest, NextResponse } from "next/server";
import {
  runScheduledOpportunityScan,
  RawScannedOpportunity,
} from "@/lib/opportunity-scanner";

async function sendTelegramNotification(
  opp: RawScannedOpportunity,
  appBaseUrl: string
): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();

  if (!token || !chatId) {
    return {
      ok: false,
      error: "TELEGRAM_BOT_TOKEN ou TELEGRAM_CHAT_ID manquant côté serveur",
    };
  }

  const offerUrl = `${appBaseUrl.replace(/\/$/, "")}/offers/${encodeURIComponent(
    opp.id
  )}`;

  const text = [
    "Nouvelle offre detectee sur Trako",
    `Poste : ${opp.title || "Opportunite"}`,
    `Entreprise : ${opp.company || "Entreprise"}`,
    opp.type ? `Type : ${opp.type}` : null,
    `Lieu : ${opp.location || "France"}`,
    `Fiche & CV ATS : ${offerUrl}`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: false,
      }),
    });

    const data = (await res.json().catch(() => null)) as {
      ok?: boolean;
      description?: string;
    } | null;

    if (!res.ok || !data?.ok) {
      return {
        ok: false,
        error: data?.description || `HTTP ${res.status}`,
      };
    }

    return { ok: true };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erreur réseau Telegram",
    };
  }
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (secret) {
    const authHeader = req.headers.get("authorization");
    const querySecret = req.nextUrl.searchParams.get("secret");
    const isAuthorized =
      authHeader === `Bearer ${secret}` || querySecret === secret;
    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, error: "Non autorisé" },
        { status: 401 }
      );
    }
  }

  try {
    const { searchParams } = req.nextUrl;
    const baseUrl =
      process.env.APP_BASE_URL?.trim() ||
      req.nextUrl.origin ||
      "http://localhost:3000";

    const contractsRaw = searchParams.get("contracts") || "STAGE,ALTERNANCE";
    const contracts = contractsRaw
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);

    const seenRaw = searchParams.get("seen") || "";
    const seenIds = seenRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const result = await runScheduledOpportunityScan({
      rome: searchParams.get("rome") || "M1805",
      territory: searchParams.get("territory") || "75",
      contracts,
      q: searchParams.get("q") || "stage",
      offered: searchParams.get("offered") || "",
      wantedSkills: searchParams.get("wantedSkills") || "",
      seenIds,
    });

    let notificationsSent = 0;
    const notificationErrors: string[] = [];

    for (const opp of result.newOpportunities.slice(0, 5)) {
      const sent = await sendTelegramNotification(opp, baseUrl);
      if (sent.ok) {
        notificationsSent += 1;
      } else if (sent.error) {
        notificationErrors.push(sent.error);
      }
    }

    return NextResponse.json({
      success: true,
      scannedAt: result.scannedAt,
      totalFound: result.totalFound,
      newCount: result.newOpportunities.length,
      notificationsSent,
      notificationErrors: notificationErrors.slice(0, 3),
      newOpportunities: result.newOpportunities,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Erreur cron scan",
      },
      { status: 500 }
    );
  }
}