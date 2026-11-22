import { MasterCV } from "@/types/cv";

export interface SearchCriteria {
  id: string;
  label: string;
  contractTypes: string[]; // STAGE, ALTERNANCE, CDI, CDD, AUTRE
  keywords: string[];
  location: string;
  maxDistanceKm: number;
  minDurationMonths?: number;
  maxDurationMonths?: number;
  season?: string;
}

export interface JobOffer {
  id: string;
  title: string;
  company: string;
  contractType: string;
  duration?: string;
  location: string;
  applyUrl: string;
  description: string;
  source: string;
  createdAt: string;
}

export interface OfferAnalysis {
  score: number;
  requiredSkills: string[];
  yourStrengths: string[];
  missingSkills: string[];
  pros: string[];
  cons: string[];
  budgetAndLogistics: {
    location: string;
    isRemote: boolean;
    estimatedIncome: number;
    estimatedCost: number;
    netBalance: number;
    summary: string;
  };
  adaptedCV: MasterCV;
}

const KNOWN_SKILLS = [
  "python", "sql", "javascript", "typescript", "react", "next.js", "node.js",
  "html", "css", "tailwind", "excel", "power bi", "tableau", "git", "docker",
  "linux", "java", "c++", "c#", "php", "figma", "autocad", "solidworks",
  "gestion de projet", "agile", "scrum", "anglais", "communication",
  "autonomie", "analyse de données", "machine learning", "ia", "sap", "erp"
];

function extractDurationMonths(duration?: string, description?: string): number | null {
  const text = `${duration || ""} ${description || ""}`.toLowerCase();
  const monthMatch = text.match(/(\d{1,2})\s*(?:mois|m)/);
  if (monthMatch) {
    const m = Number(monthMatch[1]);
    if (m > 0 && m <= 36) return m;
  }
  const yearMatch = text.match(/(\d)\s*(?:an|ans)/);
  if (yearMatch) {
    return Number(yearMatch[1]) * 12;
  }
  return null;
}

function isHighCostZone(location: string, description: string): boolean {
  const loc = `${location} ${description}`.toLowerCase();
  return (
    loc.includes("paris") ||
    loc.includes("75") ||
    loc.includes("92") ||
    loc.includes("93") ||
    loc.includes("94") ||
    loc.includes("lyon") ||
    loc.includes("69") ||
    loc.includes("bordeaux") ||
    loc.includes("33") ||
    loc.includes("nice") ||
    loc.includes("06")
  );
}

export function analyzeAndAdaptForOffer(
  cv: MasterCV,
  offer: JobOffer,
  userCity?: string
): OfferAnalysis {
  const fullOfferText = `${offer.title} ${offer.description}`.toLowerCase();
  const contractUpper = (offer.contractType || "").toUpperCase();

  const userTech = cv.skills?.technical || [];
  const userSoft = cv.skills?.soft || [];
  const allUserSkills = [...userTech, ...userSoft];

  // 1. Ce que tu apportes déjà
  const yourStrengths = allUserSkills.filter((skill) =>
    fullOfferText.includes(skill.toLowerCase())
  );

  // 2. Compétences repérées dans l'offre
  const detectedInOffer = KNOWN_SKILLS.filter((kw) =>
    fullOfferText.includes(kw)
  );

  const requiredSkills = Array.from(
    new Set([
      ...detectedInOffer.map((s) => s.charAt(0).toUpperCase() + s.slice(1)),
      ...yourStrengths,
    ])
  );

  const missingSkills = requiredSkills.filter(
    (req) => !yourStrengths.some((s) => s.toLowerCase() === req.toLowerCase())
  );

  const score =
    requiredSkills.length > 0
      ? Math.min(98, Math.max(30, Math.round((yourStrengths.length / requiredSkills.length) * 100)))
      : 65;

  // 3. Logistique & Budget dynamiques
  const isRemote =
    fullOfferText.includes("télétravail") ||
    fullOfferText.includes("full remote") ||
    fullOfferText.includes("100% remote");

  const isHybrid =
    !isRemote &&
    (fullOfferText.includes("hybride") || fullOfferText.includes("remote"));

  const cleanUserCity = (userCity || "").trim().toLowerCase();
  const isLocal =
    Boolean(cleanUserCity) &&
    offer.location.toLowerCase().includes(cleanUserCity);

  const durationMonths = extractDurationMonths(offer.duration, offer.description);
  const expensiveZone = isHighCostZone(offer.location, offer.description);

  // Revenu / indemnité mensuelle estimé selon le type de contrat et la durée
  let estimatedIncome = 1650;
  if (contractUpper.includes("STAGE")) {
    const longStageBonus = durationMonths && durationMonths >= 4 ? 130 : 0;
    const zoneBonus = expensiveZone ? 120 : 0;
    estimatedIncome = 670 + longStageBonus + zoneBonus;
  } else if (contractUpper.includes("ALTERN")) {
    const multiYearBonus = durationMonths && durationMonths >= 12 ? 140 : 0;
    const zoneBonus = expensiveZone ? 110 : 0;
    estimatedIncome = 1220 + multiYearBonus + zoneBonus;
  } else if (contractUpper.includes("CDD") || contractUpper.includes("INTERIM")) {
    estimatedIncome = expensiveZone ? 2150 : 1880;
  } else if (contractUpper.includes("CDI")) {
    estimatedIncome = expensiveZone ? 2550 : 2150;
  } else {
    // AUTRE (mission, service civique, projet, etc.)
    estimatedIncome = expensiveZone ? 1150 : 950;
  }

  // Coût mensuel estimé (trajet / logement / zone)
  let estimatedCost = expensiveZone ? 680 : 460;
  if (isLocal) {
    estimatedCost = expensiveZone ? 135 : 85;
  } else if (isRemote) {
    estimatedCost = expensiveZone ? 190 : 120;
  } else if (isHybrid) {
    estimatedCost = expensiveZone ? 440 : 290;
  }

  const netBalance = estimatedIncome - estimatedCost;

  // 4. Points positifs / négatifs
  const pros: string[] = [];
  const cons: string[] = [];

  if (yourStrengths.length > 0) {
    pros.push(`Correspondance directe sur : ${yourStrengths.slice(0, 5).join(", ")}`);
  }
  if (isLocal) {
    pros.push(`Localisé près de ${userCity} (trajet quotidien réduit)`);
  }
  if (isRemote || isHybrid) {
    pros.push(isRemote ? "Télétravail complet possible" : "Organisation hybride / télétravail partiel");
  }
  if (durationMonths) {
    pros.push(`Durée identifiée : ${durationMonths} mois`);
  }
  if (pros.length === 0) {
    pros.push("Profil polyvalent adaptable aux missions décrites");
  }

  if (missingSkills.length > 0) {
    cons.push(`Compétences à renforcer ou mettre en avant : ${missingSkills.slice(0, 4).join(", ")}`);
  }
  if (!isLocal && !isRemote) {
    cons.push(`Mobilité à anticiper sur ${offer.location}${expensiveZone ? " (zone tendue)" : ""}`);
  }
  if (netBalance < 0) {
    cons.push(`Estimation budgétaire tendue (${netBalance} €/mois) : prévoir aides ou colocation`);
  }
  if (cons.length === 0) {
    cons.push("Aucun frein majeur détecté sur l'annonce");
  }

  // 5. Adaptation automatique du CV (priorisation compétences + réalisations pertinentes)
  const offerTokens = Array.from(
    new Set([
      ...yourStrengths.map((s) => s.toLowerCase()),
      ...requiredSkills.map((s) => s.toLowerCase()),
      ...offer.title
        .toLowerCase()
        .split(/[^a-zàâäéèêëïîôöùûüç0-9.+#-]+/i)
        .filter((w) => w.length >= 3),
    ])
  );

  const scoreHighlight = (line: string): number => {
    const lower = line.toLowerCase();
    return offerTokens.reduce(
      (acc, token) => (lower.includes(token) ? acc + 1 : acc),
      0
    );
  };

  const prioritizedTech = [
    ...userTech.filter((s) => fullOfferText.includes(s.toLowerCase())),
    ...userTech.filter((s) => !fullOfferText.includes(s.toLowerCase())),
  ];

  const adaptedExperiences = (cv.experiences || []).map((exp) => {
    const sortedHighlights = [...(exp.highlights || [])].sort(
      (a, b) => scoreHighlight(b) - scoreHighlight(a)
    );
    return {
      ...exp,
      highlights: sortedHighlights,
    };
  });

  const adaptedSummary = cv.summary
    ? `${cv.summary} Candidature ciblée pour ${offer.title} (${offer.contractType || "Opportunité"}) chez ${offer.company}${
        yourStrengths.length > 0
          ? ` avec une expérience/maîtrise sur ${yourStrengths.slice(0, 4).join(", ")}.`
          : "."
      }`
    : `Candidat motivé pour ${offer.title} (${offer.contractType || "Opportunité"}) chez ${offer.company}.`;

  const adaptedCV: MasterCV = {
    ...cv,
    targetTitle: `${offer.title}${offer.contractType ? ` (${offer.contractType})` : ""}`,
    summary: adaptedSummary,
    skills: {
      ...cv.skills,
      technical: prioritizedTech,
    },
    experiences: adaptedExperiences,
  };

  const logisticsSummary = isLocal
    ? `Estimation locale (${userCity || "proximité"}) : coût mensuel limité aux déplacements.`
    : isRemote
    ? "Estimation télétravail : frais de transport réduits, prévoir équipement/connexion."
    : isHybrid
    ? `Estimation hybride (${offer.location}) : alternance domicile / présence sur site.`
    : `Estimation mobilité (${offer.location}) : logement + trajet (aides APL / Action Logement possibles).`;

  return {
    score,
    requiredSkills,
    yourStrengths,
    missingSkills,
    pros,
    cons,
    budgetAndLogistics: {
      location: offer.location || "Non précisé",
      isRemote: isRemote || isHybrid,
      estimatedIncome,
      estimatedCost,
      netBalance,
      summary: logisticsSummary,
    },
    adaptedCV,
  };
}