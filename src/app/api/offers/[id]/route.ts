import { NextRequest, NextResponse } from "next/server";
import { runTrakoScan } from "@/lib/trako-collector";
import type { RawScannedOpportunity } from "@/lib/opportunity-scanner";
import type { JobOffer } from "@/lib/trako-engine";

function mapRawToJobOffer(raw: RawScannedOpportunity): JobOffer {
  const rawType = (raw.type || "").toUpperCase();
  const contractType: JobOffer["contractType"] = rawType.includes("ALTERNANCE")
    ? "ALTERNANCE"
    : rawType.includes("STAGE")
    ? "STAGE"
    : rawType.includes("CDI")
    ? "CDI"
    : rawType.includes("CDD")
    ? "CDD"
    : rawType.includes("ENTREPRISE")
    ? "ENTREPRISE_CIBLE"
    : "STAGE";

  return {
    id: raw.id,
    title: raw.title || "Opportunité détectée",
    company: raw.company || "Entreprise",
    contractType,
    location: raw.postalCode
      ? `${raw.location || "France"} (${raw.postalCode})`
      : raw.location || "France",
    applyUrl: raw.url || "#",
    source: raw.source || "Scanner Trako",
    createdAt: new Date().toISOString(),
    description:
      raw.description ||
      `${raw.title || "Poste"} chez ${raw.company || "l'entreprise"} (${
        raw.location || "France"
      }).`,
  };
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const targetId = decodeURIComponent(id || "").trim();

  if (!targetId) {
    return NextResponse.json(
      { success: false, error: "Identifiant d'offre manquant" },
      { status: 400 }
    );
  }

  try {
    const { searchParams } = req.nextUrl;
    const contractsRaw = searchParams.get("contracts") || "STAGE,ALTERNANCE";
    const contracts = contractsRaw
      .split(",")
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean);

    const rawList = await runTrakoScan({
      rome: searchParams.get("rome") || "M1805",
      territory: searchParams.get("territory") || "75",
      radius: 30,
      contracts: contracts.length > 0 ? contracts : ["STAGE", "ALTERNANCE"],
      keywords: searchParams.get("q") || undefined,
      limit: 50,
    });

    const opportunities = (
      Array.isArray(rawList) ? rawList : []
    ) as RawScannedOpportunity[];

    const match = opportunities.find(
      (item) => (item.id || "").toLowerCase() === targetId.toLowerCase()
    );

    if (!match) {
      return NextResponse.json(
        { success: false, error: "Offre introuvable dans le scan actuel" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      offer: mapRawToJobOffer(match),
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : "Erreur lors de la récupération de l'offre",
      },
      { status: 500 }
    );
  }
}