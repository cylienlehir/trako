// src/app/api/scan/route.ts
import { NextRequest, NextResponse } from "next/server";
import { runTrakoScan } from "@/lib/trako-collector";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const rome = searchParams.get("rome") || "M1805";
    const territory = searchParams.get("territory") || "75";
    const radius = Number(searchParams.get("radius") || "30");
    const limit = Number(searchParams.get("limit") || "35");

    const latParam = searchParams.get("lat");
    const lonParam = searchParams.get("lon");
    const inseeParam = searchParams.get("insee") || undefined;

    const latitude = latParam !== null ? Number(latParam) : undefined;
    const longitude = lonParam !== null ? Number(lonParam) : undefined;

    const contractsRaw = searchParams.get("contracts") || "";
    const contracts = contractsRaw
      .split(",")
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean);

    const keywords = [
      searchParams.get("q") || "",
      searchParams.get("wantedSkills") || "",
      searchParams.get("offered") || "",
    ]
      .map((s) => s.trim())
      .filter(Boolean)
      .join(" ");

    const opportunities = await runTrakoScan({
      rome,
      territory,
      latitude: Number.isFinite(latitude) ? latitude : undefined,
      longitude: Number.isFinite(longitude) ? longitude : undefined,
      radius: Number.isFinite(radius) ? radius : 30,
      insee: inseeParam,
      contracts: contracts.length > 0 ? contracts : undefined,
      keywords: keywords || undefined,
      limit: Number.isFinite(limit) ? limit : 35,
    });

    return NextResponse.json({
      success: true,
      count: opportunities.length,
      rome,
      territory,
      contracts,
      scannedAt: new Date().toISOString(),
      opportunities,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Erreur lors du scan Trako";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}