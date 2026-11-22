import { NextRequest, NextResponse } from "next/server";
import {
  fetchFranceTravailAgencies,
  fetchMarketAndAccessStats,
} from "@/lib/trako-market";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const romeCode = searchParams.get("rome") || "M1805";
    const territoryCode = searchParams.get("territory") || "75";
    const territoryTypeParam = searchParams.get("territoryType");
    const territoryType =
      territoryTypeParam === "REGION" ? "REGION" : "DEPARTEMENT";

    const [agencies, marketStats] = await Promise.all([
      fetchFranceTravailAgencies(territoryCode),
      fetchMarketAndAccessStats({
        romeCode,
        territoryCode,
        territoryType,
      }),
    ]);

    return NextResponse.json({
      success: true,
      fetchedAt: new Date().toISOString(),
      romeCode,
      territoryCode,
      territoryType,
      agenciesCount: agencies.length,
      agencies,
      marketStats,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Erreur lors de la récupération des données marché et agences";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}