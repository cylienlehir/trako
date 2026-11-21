import { MasterCV } from "@/types/cv";

export interface SearchCriteria {
  id: string;
  label: string;
  contractTypes: string[]; // STAGE, ALTERNANCE, CDI, CDD, INTERIM
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

export function analyzeAndAdaptForOffer(
  cv: MasterCV,
  offer: JobOffer,
  userCity?: string
): OfferAnalysis {
  const fullOfferText = `${offer.title} ${offer.description}`.toLowerCase();

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

  // Inclure aussi les compétences utilisateur trouvées même si hors liste standard
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

  // 3. Logistique & Budget
  const isRemote =
    fullOfferText.includes("télétravail") ||
    fullOfferText.includes("remote") ||
    fullOfferText.includes("hybride");

  const isLocal =
    Boolean(userCity) &&
    offer.location.toLowerCase().includes((userCity || "").toLowerCase());

  const isStage = offer.contractType.toUpperCase().includes("STAGE");
  const estimatedIncome = isStage ? 670 : 1500;
  const estimatedCost = isLocal ? 75 : isRemote ? 160 : 620;
  const netBalance = estimatedIncome - estimatedCost;

  // 4. Points positifs / négatifs
  const pros: string[] = [];
  const cons: string[] = [];

  if (yourStrengths.length > 0) {
    pros.push(`Correspondance directe sur : ${yourStrengths.slice(0, 5).join(", ")}`);
  }
  if (isLocal) {
    pros.push(`Localisé près de ${userCity} (trajet quotidien simple)`);
  }
  if (isRemote) {
    pros.push("Télétravail ou mode hybride possible");
  }
  if (pros.length === 0) {
    pros.push("Profil polyvalent adaptable aux missions décrites");
  }

  if (missingSkills.length > 0) {
    cons.push(`Mots-clés de l'annonce absents de ton CV : ${missingSkills.slice(0, 4).join(", ")}`);
  }
  if (!isLocal && !isRemote) {
    cons.push(`Déplacement ou logement temporaire à prévoir (${offer.location})`);
  }
  if (cons.length === 0) {
    cons.push("Aucun frein majeur détecté sur l'annonce");
  }

  // 5. Adaptation automatique du CV (priorisation des compétences qui matchent)
  const prioritizedTech = [
    ...userTech.filter((s) => fullOfferText.includes(s.toLowerCase())),
    ...userTech.filter((s) => !fullOfferText.includes(s.toLowerCase())),
  ];

  const adaptedSummary = cv.summary
    ? `${cv.summary} Candidature ciblée pour le poste de ${offer.title} chez ${offer.company}${
        yourStrengths.length > 0
          ? ` avec une maîtrise opérationnelle de ${yourStrengths.slice(0, 4).join(", ")}.`
          : "."
      }`
    : `Candidat motivé pour le poste de ${offer.title} (${offer.contractType}) chez ${offer.company}.`;

  const adaptedCV: MasterCV = {
    ...cv,
    targetTitle: `${offer.title} (${offer.contractType})`,
    summary: adaptedSummary,
    skills: {
      ...cv.skills,
      technical: prioritizedTech,
    },
  };

  return {
    score,
    requiredSkills,
    yourStrengths,
    missingSkills,
    pros,
    cons,
    budgetAndLogistics: {
      location: offer.location || "Non précisé",
      isRemote,
      estimatedIncome,
      estimatedCost,
      netBalance,
      summary: isLocal
        ? "Trajet local : coût mensuel limité aux transports."
        : isRemote
        ? "Hybride / Télétravail : déplacements ponctuels à budgéter."
        : "Mobilité requise : prévoir logement temporaire + aides (APL, Mobili-Jeune).",
    },
    adaptedCV,
  };
}