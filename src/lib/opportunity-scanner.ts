import { runTrakoScan } from "@/lib/trako-collector";

export interface RawScannedOpportunity {
  id: string;
  title: string;
  company: string;
  type?: string;
  location: string;
  postalCode?: string;
  url?: string;
  description?: string;
  source?: string;
}

export interface CronScanParams {
  rome?: string;
  territory?: string;
  contracts?: string[];
  q?: string;
  offered?: string;
  wantedSkills?: string;
  radius?: number;
  limit?: number;
  seenIds?: string[];
}

export interface CronScanResult {
  scannedAt: string;
  totalFound: number;
  newOpportunities: RawScannedOpportunity[];
  allOpportunities: RawScannedOpportunity[];
}

export function buildOfferFingerprint(opp: RawScannedOpportunity): string {
  const title = (opp.title || "").trim().toLowerCase();
  const company = (opp.company || "").trim().toLowerCase();
  const location = (opp.location || "").trim().toLowerCase();
  return `${title}|${company}|${location}`;
}

export async function runScheduledOpportunityScan(
  params: CronScanParams
): Promise<CronScanResult> {
  const contracts =
    params.contracts && params.contracts.length > 0
      ? params.contracts.map((c) => c.trim().toUpperCase()).filter(Boolean)
      : ["STAGE", "ALTERNANCE"];

  const keywords = [params.q || "", params.wantedSkills || "", params.offered || ""]
    .map((s) => s.trim())
    .filter(Boolean)
    .join(" ");

  const rawResult = await runTrakoScan({
    rome: params.rome || "M1805",
    territory: params.territory || "75",
    radius: Number.isFinite(params.radius) ? params.radius : 30,
    contracts,
    keywords: keywords || undefined,
    limit: Number.isFinite(params.limit) ? params.limit : 35,
  });

  const opportunities = (
    Array.isArray(rawResult) ? rawResult : []
  ) as RawScannedOpportunity[];

  const seenSet = new Set((params.seenIds || []).map((s) => s.toLowerCase()));

  const newOpportunities = opportunities.filter((opp) => {
    const idMatch = opp.id && seenSet.has(opp.id.toLowerCase());
    const fpMatch = seenSet.has(buildOfferFingerprint(opp).toLowerCase());
    return !idMatch && !fpMatch;
  });

  return {
    scannedAt: new Date().toISOString(),
    totalFound: opportunities.length,
    newOpportunities,
    allOpportunities: opportunities,
  };
}