// src/lib/trako-market.ts
import { getFranceTravailToken } from "@/lib/trako-collector";

export interface FranceTravailAgency {
  id: string;
  name: string;
  type: string;
  address: string;
  postalCode: string;
  city: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
}

export interface TerritoryMarketStats {
  romeCode: string;
  territoryCode: string;
  territoryType: "DEP" | "REG";
  accessRatePercent: number | null;
  accessLabel: string;
  accessPeriod: string;
  hiringCount: number | null;
  hiringLabel: string;
  hiringPeriod: string;
  dynamicSummary: string;
  rawAccessData?: unknown;
  rawHiringData?: unknown;
}

interface RawAgency {
  code?: string;
  libelle?: string;
  type?: string;
  contact?: {
    email?: string;
    telephonePublic?: string;
  };
  adressePrincipale?: {
    ligne1?: string;
    ligne2?: string;
    ligne3?: string;
    codePostal?: string;
    commune?: string;
    gpsLat?: number;
    gpsLon?: number;
  };
}

interface StatPeriodeItem {
  codeTerritoire?: string;
  libelleTerritoire?: string;
  codeActivite?: string;
  libelleActivite?: string;
  codeNomenclature?: string;
  libelleNomenclature?: string;
  libellePeriode?: string;
  valeurPrincipaleNom?: string;
  valeurPrincipaleMontant?: number;
}

interface StatApiResponse {
  libelleIndicateur?: string;
  listeValeursParPeriode?: StatPeriodeItem[];
}

async function postIndicatorWithFallback(params: {
  url: string;
  token: string;
  baseBody: Record<string, unknown>;
  nomenclatures: string[];
  label: string;
}): Promise<StatApiResponse | null> {
  let lastStatus = 400;
  let lastText = "";

  for (const codeTypeNomenclature of params.nomenclatures) {
    const res = await fetch(params.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${params.token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...params.baseBody,
        codeTypeNomenclature,
      }),
      cache: "no-store",
    });

    if (res.ok) {
      return (await res.json()) as StatApiResponse;
    }

    lastStatus = res.status;
    lastText = await res.text();

    // Si ce n'est pas une erreur 400 de paramètres/nomenclature, inutile de boucler
    if (res.status !== 400) {
      break;
    }
  }

  console.error(`Erreur ${params.label}:`, lastStatus, lastText);
  return null;
}

/**
 * Récupère les agences France Travail (Référentiel des agences v1)
 */
export async function fetchFranceTravailAgencies(
  departmentOrCommuneCode?: string
): Promise<FranceTravailAgency[]> {
  try {
    const token = await getFranceTravailToken(
      "api_referentielagencesv1 organisationpe"
    );

    const url = new URL(
      "https://api.francetravail.io/partenaire/referentielagences/v1/agences"
    );
    if (departmentOrCommuneCode) {
      url.searchParams.set("commune", departmentOrCommuneCode);
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      console.error(
        "Erreur Référentiel des agences:",
        response.status,
        await response.text()
      );
      return [];
    }

    const data: unknown = await response.json();
    const list: RawAgency[] = Array.isArray(data)
      ? (data as RawAgency[])
      : ((data as { agences?: RawAgency[] })?.agences ?? []);

    return list.map((ag, idx) => ({
      id: ag.code || `agency-${idx}`,
      name: ag.libelle || "Agence France Travail",
      type: ag.type || "Agence",
      address:
        ag.adressePrincipale?.ligne2 ||
        ag.adressePrincipale?.ligne1 ||
        "",
      postalCode: ag.adressePrincipale?.codePostal || "",
      city: ag.adressePrincipale?.commune || "",
      latitude: ag.adressePrincipale?.gpsLat,
      longitude: ag.adressePrincipale?.gpsLon,
      phone: ag.contact?.telephonePublic,
    }));
  } catch (error: unknown) {
    console.error("Exception Référentiel des agences:", error);
    return [];
  }
}

/**
 * Récupère le taux d'accès à l'emploi (ACC_1) et les stats d'embauches (EMB_1)
 */
export async function fetchMarketAndAccessStats(params: {
  romeCode: string;
  territoryCode: string;
  territoryType?: "DEPARTEMENT" | "REGION";
}): Promise<TerritoryMarketStats> {
  const codeTypeTerritoire: "DEP" | "REG" =
    params.territoryType === "REGION" ? "REG" : "DEP";

  let accessRatePercent: number | null = null;
  let accessLabel = "Taux d'accès à l'emploi à 6 mois";
  let accessPeriod = "";
  let rawAccessData: unknown = null;

  let hiringCount: number | null = null;
  let hiringLabel = "Nombre d'embauches";
  let hiringPeriod = "";
  let rawHiringData: unknown = null;

  try {
    const [accessToken, hiringToken] = await Promise.all([
      getFranceTravailToken(
        "retouremploi api_stats-perspectives-retour-emploiv1"
      ),
      getFranceTravailToken(
        "offresetdemandesemploi api_stats-offres-demandes-emploiv1"
      ),
    ]);

    const [accessParsed, hiringParsed] = await Promise.all([
      postIndicatorWithFallback({
        url: "https://api.francetravail.io/partenaire/stats-perspectives-retour-emploi/v1/indicateur/stat-acces-emploi",
        token: accessToken,
        baseBody: {
          codeTypeTerritoire,
          codeTerritoire: params.territoryCode,
          codeTypeActivite: "ROME",
          codeActivite: params.romeCode,
          codeTypePeriode: "TRIMESTRE",
          dernierePeriode: true,
        },
        nomenclatures: ["ACCESEMP", "DUREEEMP", "SANS", "NATURE"],
        label: "Accès à l'emploi (ACC_1)",
      }),
      postIndicatorWithFallback({
        url: "https://api.francetravail.io/partenaire/stats-offres-demandes-emploi/v1/indicateur/stat-embauches",
        token: hiringToken,
        baseBody: {
          codeTypeTerritoire,
          codeTerritoire: params.territoryCode,
          codeTypeActivite: "ROME",
          codeActivite: params.romeCode,
          codeTypePeriode: "TRIMESTRE",
          dernierePeriode: true,
        },
        nomenclatures: ["CATCAND", "CATCANDxDUREEEMP", "DUREEEMP", "SANS"],
        label: "Stats embauches (EMB_1)",
      }),
    ]);

    if (accessParsed) {
      rawAccessData = accessParsed;
      const items = accessParsed.listeValeursParPeriode ?? [];
      const preferred =
        items.find((item) => item.codeNomenclature === "6M") ?? items[0];

      if (preferred) {
        if (typeof preferred.valeurPrincipaleMontant === "number") {
          accessRatePercent = preferred.valeurPrincipaleMontant;
        }
        if (preferred.valeurPrincipaleNom) {
          accessLabel = preferred.valeurPrincipaleNom;
        }
        if (preferred.libellePeriode) {
          accessPeriod = preferred.libellePeriode;
        }
      }
    }

    if (hiringParsed) {
      rawHiringData = hiringParsed;
      const latest = hiringParsed.listeValeursParPeriode?.[0];
      if (latest) {
        if (typeof latest.valeurPrincipaleMontant === "number") {
          hiringCount = latest.valeurPrincipaleMontant;
        }
        if (latest.valeurPrincipaleNom) hiringLabel = latest.valeurPrincipaleNom;
        if (latest.libellePeriode) hiringPeriod = latest.libellePeriode;
      }
    }
  } catch (error: unknown) {
    console.error("Exception Marché / Accès à l'emploi:", error);
  }

  return {
    romeCode: params.romeCode,
    territoryCode: params.territoryCode,
    territoryType: codeTypeTerritoire,
    accessRatePercent,
    accessLabel,
    accessPeriod,
    hiringCount,
    hiringLabel,
    hiringPeriod,
    dynamicSummary: `Analyse ROME ${params.romeCode} sur le territoire ${params.territoryCode} (${codeTypeTerritoire}).`,
    rawAccessData,
    rawHiringData,
  };
}