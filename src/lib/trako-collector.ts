// src/lib/trako-collector.ts

export interface TrakoOpportunity {
  id: string;
  title: string;
  company: string;
  type: "STAGE" | "ALTERNANCE" | "CDI" | "CDD" | "AUTRE" | "ENTREPRISE_CIBLE";
  location: string;
  postalCode?: string;
  romeCode?: string;
  url: string;
  description: string;
  source: "La Bonne Alternance" | "La Bonne Boite" | "France Travail Offres";
  publishedAt?: string;
}

export interface ScanParams {
  rome?: string;
  territory?: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
  insee?: string;
  diploma?: string;
  contracts?: string[];
  keywords?: string;
  limit?: number;
}

const DEPARTMENT_CENTERS: Record<string, { lat: number; lon: number; insee: string }> = {
  "01": { lat: 46.205, lon: 5.225, insee: "01053" },
  "06": { lat: 43.71, lon: 7.262, insee: "06088" },
  "13": { lat: 43.296, lon: 5.369, insee: "13055" },
  "21": { lat: 47.322, lon: 5.041, insee: "21231" },
  "29": { lat: 48.39, lon: -4.486, insee: "29019" },
  "31": { lat: 43.604, lon: 1.444, insee: "31555" },
  "33": { lat: 44.837, lon: -0.579, insee: "33063" },
  "34": { lat: 43.61, lon: 3.876, insee: "34172" },
  "35": { lat: 48.117, lon: -1.677, insee: "35238" },
  "38": { lat: 45.188, lon: 5.724, insee: "38185" },
  "44": { lat: 47.218, lon: -1.553, insee: "44109" },
  "45": { lat: 47.902, lon: 1.909, insee: "45234" },
  "51": { lat: 49.258, lon: 4.031, insee: "51454" },
  "54": { lat: 48.692, lon: 6.184, insee: "54395" },
  "57": { lat: 49.119, lon: 6.175, insee: "57463" },
  "59": { lat: 50.629, lon: 3.057, insee: "59350" },
  "62": { lat: 50.291, lon: 2.777, insee: "62041" },
  "63": { lat: 45.777, lon: 3.087, insee: "63113" },
  "64": { lat: 43.295, lon: -0.37, insee: "64445" },
  "67": { lat: 48.573, lon: 7.752, insee: "67482" },
  "68": { lat: 47.75, lon: 7.335, insee: "68224" },
  "69": { lat: 45.764, lon: 4.835, insee: "69123" },
  "75": { lat: 48.856, lon: 2.352, insee: "75056" },
  "76": { lat: 49.443, lon: 1.099, insee: "76540" },
  "77": { lat: 48.539, lon: 2.652, insee: "77288" },
  "78": { lat: 48.804, lon: 2.12, insee: "78646" },
  "80": { lat: 49.894, lon: 2.295, insee: "80021" },
  "83": { lat: 43.124, lon: 5.928, insee: "83137" },
  "84": { lat: 43.949, lon: 4.805, insee: "84007" },
  "91": { lat: 48.629, lon: 2.441, insee: "91228" },
  "92": { lat: 48.892, lon: 2.215, insee: "92050" },
  "93": { lat: 48.909, lon: 2.45, insee: "93008" },
  "94": { lat: 48.79, lon: 2.455, insee: "94028" },
  "95": { lat: 49.038, lon: 2.077, insee: "95127" },
  "971": { lat: 16.241, lon: -61.533, insee: "97105" },
  "972": { lat: 14.616, lon: -61.058, insee: "97209" },
  "973": { lat: 4.922, lon: -52.313, insee: "97302" },
  "974": { lat: -20.882, lon: 55.45, insee: "97411" },
};

function resolveGeoParams(params: ScanParams): {
  latitude?: number;
  longitude?: number;
  insee?: string;
  radius: number;
} {
  const radius = params.radius ?? 30;
  if (params.latitude !== undefined && params.longitude !== undefined) {
    return {
      latitude: params.latitude,
      longitude: params.longitude,
      insee: params.insee,
      radius,
    };
  }
  const dept = (params.territory || "").trim().toUpperCase();
  const center = DEPARTMENT_CENTERS[dept];
  if (center) {
    return {
      latitude: center.lat,
      longitude: center.lon,
      insee: params.insee || center.insee,
      radius,
    };
  }
  return { insee: params.insee, radius };
}

/**
 * Récupère un jeton d'accès OAuth2 France Travail pour les APIs autorisées
 */
export async function getFranceTravailToken(scopes: string): Promise<string> {
  const clientId = process.env.FRANCE_TRAVAIL_CLIENT_ID;
  const clientSecret = process.env.FRANCE_TRAVAIL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Identifiants France Travail manquants dans les variables d'environnement.");
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
    scope: scopes,
  });

  const response = await fetch(
    "https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=%2Fpartenaire",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
      cache: "no-store",
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Erreur OAuth2 France Travail (${response.status}): ${errText}`);
  }

  const data = await response.json();
  return data.access_token;
}

interface LaBonneBoiteItem {
  siret?: string;
  naf_label?: string;
  company_name?: string;
  city?: string;
  postcode?: string;
  hiring_potential?: number;
  headcount_text?: string;
}

interface FranceTravailOffreItem {
  id?: string;
  intitule?: string;
  description?: string;
  typeContrat?: string;
  typeContratLibelle?: string;
  natureContrat?: string;
  dateCreation?: string;
  entreprise?: { nom?: string };
  lieuTravail?: { libelle?: string; codePostal?: string };
  origineOffre?: { urlOrigine?: string };
}

/**
 * Collecte les offres d'alternance et recruteurs via La Bonne Alternance
 */
export async function fetchLaBonneAlternance(params: ScanParams): Promise<TrakoOpportunity[]> {
  const apiKey = process.env.LBA_API_KEY;
  if (!apiKey) {
    return [];
  }

  const geo = resolveGeoParams(params);
  const url = new URL("https://api.apprentissage.beta.gouv.fr/api/job/v1/search");
  if (params.rome) url.searchParams.set("romes", params.rome);
  if (geo.latitude !== undefined) url.searchParams.set("latitude", String(geo.latitude));
  if (geo.longitude !== undefined) url.searchParams.set("longitude", String(geo.longitude));
  url.searchParams.set("radius", String(geo.radius));
  if (geo.insee) url.searchParams.set("insee", geo.insee);
  if (params.diploma) url.searchParams.set("diploma", params.diploma);

  try {
    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      console.error("Erreur API La Bonne Alternance:", response.status, await response.text());
      return [];
    }

    const data = await response.json();
    const results: TrakoOpportunity[] = [];

    const jobs = [
      ...(data.jobs?.lbaJobs?.results || []),
      ...(data.jobs?.partnerJobs?.results || []),
    ];

    for (const job of jobs) {
      const title: string = job.title || "Offre en alternance";
      const isStage = title.toLowerCase().includes("stage");
      results.push({
        id: `lba-${job.id || Math.random().toString(36).slice(2)}`,
        title,
        company: job.company?.name || "Entreprise confidentielle",
        type: isStage ? "STAGE" : "ALTERNANCE",
        location: job.place?.city || job.place?.fullAddress || "France",
        postalCode: job.place?.zipCode,
        romeCode: params.rome,
        url: job.url || "https://labonnealternance.apprentissage.beta.gouv.fr/",
        description: job.job?.description || "Opportunité détectée via La Bonne Alternance.",
        source: "La Bonne Alternance",
        publishedAt: job.job?.creationDate,
      });
    }

    const companies = data.companies?.lbaCompanies?.results || [];
    for (const comp of companies) {
      results.push({
        id: `lba-comp-${comp.company?.siret || Math.random().toString(36).slice(2)}`,
        title: `Candidature spontanée alternance — ${comp.nafs?.[0]?.label || "Secteur ciblé"}`,
        company: comp.company?.name || "Entreprise identifiée",
        type: "ALTERNANCE",
        location: comp.place?.city || comp.place?.fullAddress || "France",
        postalCode: comp.place?.zipCode,
        romeCode: params.rome,
        url: comp.url || "https://labonnealternance.apprentissage.beta.gouv.fr/",
        description: `Entreprise à fort potentiel d'accueil en alternance (${comp.place?.distance ? `${comp.place.distance} km` : "proximité"}).`,
        source: "La Bonne Alternance",
      });
    }

    return results;
  } catch (error) {
    console.error("Exception La Bonne Alternance:", error);
    return [];
  }
}

/**
 * Collecte les offres d'emploi, stages et alternances via l'API Offres d'emploi v2 (France Travail)
 */
export async function fetchFranceTravailOffres(params: ScanParams): Promise<TrakoOpportunity[]> {
  try {
    const token = await getFranceTravailToken("api_offresdemploiv2 o2dsoffre");
    const url = new URL("https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search");

    if (params.rome) url.searchParams.set("codeROME", params.rome);
    if (params.territory) url.searchParams.set("departement", params.territory);

    const requestedContracts = (params.contracts || []).map((c) => c.toUpperCase());
    const wantsStage = requestedContracts.includes("STAGE");
    const wantsAlternance = requestedContracts.includes("ALTERNANCE");

    const keywordParts = [params.keywords || ""];
    if (wantsStage && !wantsAlternance) keywordParts.push("stage");
    if (wantsAlternance && !wantsStage) keywordParts.push("alternance");

    const q = keywordParts.join(" ").trim();
    if (q) url.searchParams.set("motsCles", q);

    if (wantsAlternance && !wantsStage) {
      url.searchParams.set("natureContrat", "E2");
    }

    url.searchParams.set("range", `0-${Math.max(29, (params.limit ?? 35) - 1)}`);

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    const items: FranceTravailOffreItem[] = data.resultats || [];

    return items.map((item) => {
      const title = item.intitule || "Offre France Travail";
      const desc = item.description || "";
      const rawContract = `${item.typeContrat || ""} ${item.natureContrat || ""} ${title}`.toLowerCase();

      let mappedType: TrakoOpportunity["type"] = "AUTRE";
      if (rawContract.includes("stage")) {
        mappedType = "STAGE";
      } else if (
        rawContract.includes("alternance") ||
        rawContract.includes("apprentissage") ||
        rawContract.includes("professionnalisation") ||
        (item.natureContrat || "").toUpperCase() === "E2"
      ) {
        mappedType = "ALTERNANCE";
      } else if ((item.typeContrat || "").toUpperCase() === "CDI") {
        mappedType = "CDI";
      } else if ((item.typeContrat || "").toUpperCase() === "CDD") {
        mappedType = "CDD";
      }

      return {
        id: `ft-${item.id || Math.random().toString(36).slice(2)}`,
        title,
        company: item.entreprise?.nom || "Entreprise (France Travail)",
        type: mappedType,
        location: item.lieuTravail?.libelle || "France",
        postalCode: item.lieuTravail?.codePostal,
        romeCode: params.rome,
        url:
          item.origineOffre?.urlOrigine ||
          (item.id
            ? `https://candidat.francetravail.fr/offres/recherche/detail/${item.id}`
            : "https://candidat.francetravail.fr/"),
        description: desc,
        source: "France Travail Offres",
        publishedAt: item.dateCreation,
      };
    });
  } catch {
    return [];
  }
}

/**
 * Collecte les entreprises qui recrutent via La Bonne Boite v2 (France Travail)
 */
export async function fetchLaBonneBoite(params: ScanParams): Promise<TrakoOpportunity[]> {
  try {
    const token = await getFranceTravailToken("api_labonneboitev2 search");
    const geo = resolveGeoParams(params);
    const url = new URL("https://api.francetravail.io/partenaire/labonneboite/v2/recherche");

    if (params.rome) url.searchParams.set("rome", params.rome);
    if (geo.latitude !== undefined) url.searchParams.set("latitude", String(geo.latitude));
    if (geo.longitude !== undefined) url.searchParams.set("longitude", String(geo.longitude));
    url.searchParams.set("distance", String(geo.radius));
    url.searchParams.set("page_size", String(params.limit ?? 35));

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      console.error("Erreur La Bonne Boite v2:", response.status, await response.text());
      return [];
    }

    const data = await response.json();
    const items: LaBonneBoiteItem[] = data.items || [];

    return items.map((item) => ({
      id: `lbb-${item.siret || Math.random().toString(36).slice(2)}`,
      title: `Candidature ciblée — ${item.naf_label || "Entreprise qui recrute"}`,
      company: item.company_name || "Entreprise",
      type: "ENTREPRISE_CIBLE",
      location: item.city || "France",
      postalCode: item.postcode,
      romeCode: params.rome,
      url: "https://labonneboite.francetravail.fr/",
      description: `Score d'embauche : ${item.hiring_potential !== undefined ? `${Math.min(100, Math.round(item.hiring_potential))}%` : "Élevé"} — Effectif : ${item.headcount_text || "Non précisé"}.`,
      source: "La Bonne Boite",
    }));
  } catch (error) {
    console.error("Exception La Bonne Boite:", error);
    return [];
  }
}

/**
 * Lance un scan complet multi-sources
 */
export async function runTrakoScan(params: ScanParams): Promise<TrakoOpportunity[]> {
  const [ftOffres, lbaResults, lbbResults] = await Promise.all([
    fetchFranceTravailOffres(params),
    fetchLaBonneAlternance(params),
    fetchLaBonneBoite(params),
  ]);

  const all = [...ftOffres, ...lbaResults, ...lbbResults];

  // Si un département précis est demandé, privilégier les résultats de ce département
  const dept = (params.territory || "").trim().toUpperCase();
  if (!dept) return all;

  const matchingDept = all.filter((item) =>
    (item.postalCode || "").toUpperCase().startsWith(dept)
  );

  return matchingDept.length >= 5 ? matchingDept : all;
}