"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  FileDown,
  Sparkles,
  Plus,
  Trash2,
  CheckCircle2,
  Radar,
  SlidersHorizontal,
  Briefcase,
  ExternalLink,
  MapPin,
  Wallet,
  ThumbsUp,
  AlertTriangle,
  RefreshCw,
  Building2,
  UserCheck,
} from "lucide-react";
import { MasterCV, ExperienceItem, EducationItem } from "@/types/cv";
import { generateATSPdf } from "@/lib/ats-pdf";
import {
  SearchCriteria,
  JobOffer,
  analyzeAndAdaptForOffer,
} from "@/lib/trako-engine";

const AgenciesLeafletMap = dynamic(
  () => import("@/components/AgenciesLeafletMap"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-72 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-500">
        Chargement de la carte OpenStreetMap...
      </div>
    ),
  }
);

const CV_STORAGE_KEY = "trako_master_cv_v1";
const CRITERIA_STORAGE_KEY = "trako_criteria_v1";
const OFFERS_STORAGE_KEY = "trako_offers_v1";

const CONTRACT_OPTIONS = ["STAGE", "ALTERNANCE", "CDI", "CDD", "AUTRE"];

const ROME_OPTIONS = [
  { code: "M1805", label: "M1805 — Études & développement informatique" },
  { code: "M1802", label: "M1802 — Expertise & conseil SI" },
  { code: "I1304", label: "I1304 — Installation & maintenance informatique" },
  { code: "H1206", label: "H1206 — Management & ingénierie études R&D" },
  { code: "M1403", label: "M1403 — Études & prospectives socio-économiques" },
  { code: "K1206", label: "K1206 — Intervention socioculturelle / accompagnement" },
];

const ALL_DEPARTMENTS: { code: string; name: string }[] = [
  { code: "01", name: "Ain" },
  { code: "02", name: "Aisne" },
  { code: "03", name: "Allier" },
  { code: "04", name: "Alpes-de-Haute-Provence" },
  { code: "05", name: "Hautes-Alpes" },
  { code: "06", name: "Alpes-Maritimes" },
  { code: "07", name: "Ardèche" },
  { code: "08", name: "Ardennes" },
  { code: "09", name: "Ariège" },
  { code: "10", name: "Aube" },
  { code: "11", name: "Aude" },
  { code: "12", name: "Aveyron" },
  { code: "13", name: "Bouches-du-Rhône" },
  { code: "14", name: "Calvados" },
  { code: "15", name: "Cantal" },
  { code: "16", name: "Charente" },
  { code: "17", name: "Charente-Maritime" },
  { code: "18", name: "Cher" },
  { code: "19", name: "Corrèze" },
  { code: "2A", name: "Corse-du-Sud" },
  { code: "2B", name: "Haute-Corse" },
  { code: "21", name: "Côte-d'Or" },
  { code: "22", name: "Côtes-d'Armor" },
  { code: "23", name: "Creuse" },
  { code: "24", name: "Dordogne" },
  { code: "25", name: "Doubs" },
  { code: "26", name: "Drôme" },
  { code: "27", name: "Eure" },
  { code: "28", name: "Eure-et-Loir" },
  { code: "29", name: "Finistère" },
  { code: "30", name: "Gard" },
  { code: "31", name: "Haute-Garonne" },
  { code: "32", name: "Gers" },
  { code: "33", name: "Gironde" },
  { code: "34", name: "Hérault" },
  { code: "35", name: "Ille-et-Vilaine" },
  { code: "36", name: "Indre" },
  { code: "37", name: "Indre-et-Loire" },
  { code: "38", name: "Isère" },
  { code: "39", name: "Jura" },
  { code: "40", name: "Landes" },
  { code: "41", name: "Loir-et-Cher" },
  { code: "42", name: "Loire" },
  { code: "43", name: "Haute-Loire" },
  { code: "44", name: "Loire-Atlantique" },
  { code: "45", name: "Loiret" },
  { code: "46", name: "Lot" },
  { code: "47", name: "Lot-et-Garonne" },
  { code: "48", name: "Lozère" },
  { code: "49", name: "Maine-et-Loire" },
  { code: "50", name: "Manche" },
  { code: "51", name: "Marne" },
  { code: "52", name: "Haute-Marne" },
  { code: "53", name: "Mayenne" },
  { code: "54", name: "Meurthe-et-Moselle" },
  { code: "55", name: "Meuse" },
  { code: "56", name: "Morbihan" },
  { code: "57", name: "Moselle" },
  { code: "58", name: "Nièvre" },
  { code: "59", name: "Nord" },
  { code: "60", name: "Oise" },
  { code: "61", name: "Orne" },
  { code: "62", name: "Pas-de-Calais" },
  { code: "63", name: "Puy-de-Dôme" },
  { code: "64", name: "Pyrénées-Atlantiques" },
  { code: "65", name: "Hautes-Pyrénées" },
  { code: "66", name: "Pyrénées-Orientales" },
  { code: "67", name: "Bas-Rhin" },
  { code: "68", name: "Haut-Rhin" },
  { code: "69", name: "Rhône" },
  { code: "70", name: "Haute-Saône" },
  { code: "71", name: "Saône-et-Loire" },
  { code: "72", name: "Sarthe" },
  { code: "73", name: "Savoie" },
  { code: "74", name: "Haute-Savoie" },
  { code: "75", name: "Paris" },
  { code: "76", name: "Seine-Maritime" },
  { code: "77", name: "Seine-et-Marne" },
  { code: "78", name: "Yvelines" },
  { code: "79", name: "Deux-Sèvres" },
  { code: "80", name: "Somme" },
  { code: "81", name: "Tarn" },
  { code: "82", name: "Tarn-et-Garonne" },
  { code: "83", name: "Var" },
  { code: "84", name: "Vaucluse" },
  { code: "85", name: "Vendée" },
  { code: "86", name: "Vienne" },
  { code: "87", name: "Haute-Vienne" },
  { code: "88", name: "Vosges" },
  { code: "89", name: "Yonne" },
  { code: "90", name: "Territoire de Belfort" },
  { code: "91", name: "Essonne" },
  { code: "92", name: "Hauts-de-Seine" },
  { code: "93", name: "Seine-Saint-Denis" },
  { code: "94", name: "Val-de-Marne" },
  { code: "95", name: "Val-d'Oise" },
  { code: "971", name: "Guadeloupe" },
  { code: "972", name: "Martinique" },
  { code: "973", name: "Guyane" },
  { code: "974", name: "La Réunion" },
  { code: "976", name: "Mayotte" },
];

interface ScannedOpportunity {
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

interface ScanApiResponse {
  success: boolean;
  scannedAt?: string;
  opportunities?: ScannedOpportunity[];
  error?: string;
}

interface FranceTravailAgency {
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

interface TerritoryMarketStats {
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
}

interface MarketApiResponse {
  success: boolean;
  agenciesCount?: number;
  agencies?: FranceTravailAgency[];
  marketStats?: TerritoryMarketStats;
}

const INITIAL_CV: MasterCV = {
  fullName: "",
  targetTitle: "",
  email: "",
  phone: "",
  city: "",
  linkedinOrPortfolio: "",
  summary: "",
  skills: {
    technical: [],
    soft: [],
    languages: ["Français"],
  },
  experiences: [],
  education: [],
};

const SAMPLE_OFFERS: JobOffer[] = [
  {
    id: "demo-1",
    title: "Stage Développeur Web / Data",
    company: "EDF (Direction Numérique)",
    contractType: "STAGE",
    duration: "6 mois",
    location: "Paris / Hybride",
    applyUrl: "https://www.edf.fr/edf-recrute",
    source: "Portail Carrières",
    createdAt: new Date().toISOString(),
    description:
      "Nous recherchons un stagiaire motivé maîtrisant Python, SQL, JavaScript ou React pour accompagner l'automatisation de nos tableaux de bord et outils internes. Télétravail hybride possible. Autonomie et esprit d'analyse appréciés.",
  },
];

function cleanQuotes(val?: string): string {
  if (!val) return "";
  return val.replace(/^["']+|["']+$/g, "").trim();
}

function parseRawTextToCV(rawText: string, base: MasterCV): MasterCV {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const emailMatch = rawText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  const phoneMatch = rawText.match(/(?:\+33|0)\s*[1-9](?:[\s.-]*\d{2}){4}/);

  const guessedName =
    lines.find(
      (l) =>
        !l.includes("@") &&
        !/\d{2,}/.test(l) &&
        l.split(" ").length >= 2 &&
        l.split(" ").length <= 4
    ) || base.fullName;

  const bulletLines = lines
    .filter((l) => /^[-•*▪‣]/.test(l))
    .map((l) => l.replace(/^[-•*▪‣]\s*/, ""));

  const importedExp: ExperienceItem[] =
    bulletLines.length > 0
      ? [
          {
            id: crypto.randomUUID(),
            role: "Expériences & Projets importés (à affiner)",
            company: "À compléter",
            startDate: "",
            endDate: "",
            highlights: bulletLines.slice(0, 12),
          },
        ]
      : base.experiences;

  return {
    ...base,
    fullName: guessedName,
    email: emailMatch ? emailMatch[0] : base.email,
    phone: phoneMatch ? phoneMatch[0].replace(/\s+/g, " ") : base.phone,
    summary:
      base.summary ||
      lines
        .filter((l) => l.length > 50 && !l.includes("@"))
        .slice(0, 2)
        .join(" "),
    experiences: importedExp,
  };
}

function mapOpportunityToJobOffer(opp: ScannedOpportunity): JobOffer {
  const upperType = (opp.type || "").toUpperCase();
  const combinedText = `${opp.title || ""} ${opp.description || ""}`.toLowerCase();

  let contractType = "AUTRE";
  if (
    upperType.includes("ALTERN") ||
    upperType.includes("APPRENT") ||
    combinedText.includes("alternance") ||
    combinedText.includes("apprentissage")
  ) {
    contractType = "ALTERNANCE";
  } else if (upperType.includes("STAGE") || combinedText.includes("stage")) {
    contractType = "STAGE";
  } else if (upperType.includes("CDI") || combinedText.includes("cdi")) {
    contractType = "CDI";
  } else if (upperType.includes("CDD") || combinedText.includes("cdd")) {
    contractType = "CDD";
  }

  return {
    id: opp.id || crypto.randomUUID(),
    title: cleanQuotes(opp.title) || "Opportunité détectée",
    company: cleanQuotes(opp.company) || "Entreprise",
    contractType,
    location: opp.postalCode
      ? `${cleanQuotes(opp.location)} (${cleanQuotes(opp.postalCode)})`
      : cleanQuotes(opp.location) || "France",
    applyUrl: opp.url || "#",
    source: cleanQuotes(opp.source) || "Radar Trako",
    createdAt: new Date().toISOString(),
    description:
      cleanQuotes(opp.description) ||
      `${opp.title} chez ${opp.company} à ${opp.location}.`,
  };
}

export default function TrakoApp() {
  const [activeTab, setActiveTab] = useState<"radar" | "cv" | "criteria">("radar");
  const [cv, setCv] = useState<MasterCV>(INITIAL_CV);
  const [criteriaList, setCriteriaList] = useState<SearchCriteria[]>([]);
  const [offers, setOffers] = useState<JobOffer[]>(SAMPLE_OFFERS);
  const [selectedOfferId, setSelectedOfferId] = useState<string>("demo-1");

  // Formulaire de scan ciblé (Stage / Alternance / CDI / CDD / Autre + CV & Compétences)
  const [scanRome, setScanRome] = useState("M1805");
  const [customRoleOrSector, setCustomRoleOrSector] = useState("");
  const [scanTerritory, setScanTerritory] = useState("75");
  const [selectedScanContracts, setSelectedScanContracts] = useState<string[]>([
    "STAGE",
    "ALTERNANCE",
  ]);
  const [searchedSkills, setSearchedSkills] = useState("");
  const [offeredSkillsAndPitch, setOfferedSkillsAndPitch] = useState("");
  const [cvQuickPaste, setCvQuickPaste] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanAt, setLastScanAt] = useState<string | null>(null);
  const [marketStats, setMarketStats] = useState<TerritoryMarketStats | null>(null);
  const [agencies, setAgencies] = useState<FranceTravailAgency[]>([]);
  const [selectedAgencyId, setSelectedAgencyId] = useState<string | null>(null);
  const [showAgenciesPanel, setShowAgenciesPanel] = useState(false);

  // États formulaire CV
  const [techInput, setTechInput] = useState("");
  const [softInput, setSoftInput] = useState("");
  const [rawImportText, setRawImportText] = useState("");
  const [notice, setNotice] = useState("");

  // États formulaire Critères
  const [critLabel, setCritLabel] = useState("");
  const [critContracts, setCritContracts] = useState<string[]>(["STAGE", "ALTERNANCE"]);
  const [critKeywords, setCritKeywords] = useState("");
  const [critLocation, setCritLocation] = useState("");
  const [critDistance, setCritDistance] = useState(30);
  const [critDuration, setCritDuration] = useState("");
  const [critSeason, setCritSeason] = useState("");

  // États ajout manuel d'offre pour analyse immédiate
  const [newOfferTitle, setNewOfferTitle] = useState("");
  const [newOfferCompany, setNewOfferCompany] = useState("");
  const [newOfferContract, setNewOfferContract] = useState("STAGE");
  const [newOfferLocation, setNewOfferLocation] = useState("");
  const [newOfferUrl, setNewOfferUrl] = useState("");
  const [newOfferDesc, setNewOfferDesc] = useState("");

  const showNotice = useCallback((msg: string) => {
    setNotice(msg);
    window.setTimeout(() => setNotice(""), 3500);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const savedCv = localStorage.getItem(CV_STORAGE_KEY);
        if (savedCv) setCv(JSON.parse(savedCv));

        const savedCrit = localStorage.getItem(CRITERIA_STORAGE_KEY);
        if (savedCrit) setCriteriaList(JSON.parse(savedCrit));

        const savedOffers = localStorage.getItem(OFFERS_STORAGE_KEY);
        if (savedOffers) {
          const parsed = JSON.parse(savedOffers);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setOffers(parsed);
            setSelectedOfferId(parsed[0].id);
          }
        }
      } catch {
        // ignore storage errors
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem(CV_STORAGE_KEY, JSON.stringify(cv));
  }, [cv]);

  useEffect(() => {
    localStorage.setItem(CRITERIA_STORAGE_KEY, JSON.stringify(criteriaList));
  }, [criteriaList]);

  useEffect(() => {
    localStorage.setItem(OFFERS_STORAGE_KEY, JSON.stringify(offers));
  }, [offers]);

  const toggleScanContract = (contract: string) => {
    setSelectedScanContracts((prev) =>
      prev.includes(contract) ? prev.filter((c) => c !== contract) : [...prev, contract]
    );
  };

  const applyCvToScanForm = () => {
    let workingCv = cv;
    if (cvQuickPaste.trim()) {
      workingCv = parseRawTextToCV(cvQuickPaste, cv);
      setCv(workingCv);
    }

    const allCvSkills = [
      ...workingCv.skills.technical,
      ...workingCv.skills.soft,
    ].filter(Boolean);

    if (workingCv.targetTitle && !customRoleOrSector.trim()) {
      setCustomRoleOrSector(workingCv.targetTitle);
    }
    if (allCvSkills.length > 0) {
      setOfferedSkillsAndPitch(allCvSkills.join(", "));
    } else if (workingCv.summary) {
      setOfferedSkillsAndPitch(workingCv.summary.slice(0, 180));
    }

    showNotice("Profil CV & compétences synchronisés avec le formulaire de scan.");
  };

  const handleScanNow = useCallback(
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      setIsScanning(true);

      let activeCv = cv;
      if (cvQuickPaste.trim()) {
        activeCv = parseRawTextToCV(cvQuickPaste, cv);
        setCv(activeCv);
      }

      const combinedKeywords = [
        customRoleOrSector,
        searchedSkills,
        offeredSkillsAndPitch,
        ...activeCv.skills.technical.slice(0, 4),
      ]
        .map((s) => s.trim())
        .filter(Boolean)
        .join(" ");

      const contractsParam =
        selectedScanContracts.length > 0
          ? selectedScanContracts.join(",")
          : "STAGE,ALTERNANCE,CDI,CDD,AUTRE";

      try {
        const query = new URLSearchParams({
          rome: scanRome,
          territory: scanTerritory,
          contracts: contractsParam,
          q: combinedKeywords,
          offered: offeredSkillsAndPitch.trim(),
          wantedSkills: searchedSkills.trim(),
        });

        const [scanRes, marketRes] = await Promise.all([
          fetch(`/api/scan?${query.toString()}`, { cache: "no-store" }),
          fetch(
            `/api/market?rome=${encodeURIComponent(scanRome)}&territory=${encodeURIComponent(scanTerritory)}`,
            { cache: "no-store" }
          ),
        ]);

        const scanData = (await scanRes.json()) as ScanApiResponse;
        const marketData = (await marketRes.json()) as MarketApiResponse;

        if (!scanRes.ok || !scanData.success) {
          throw new Error(scanData.error || "Erreur lors du scan des opportunités.");
        }

        const mapped = (scanData.opportunities ?? []).map(mapOpportunityToJobOffer);
        if (mapped.length > 0) {
          setOffers((prev) => {
            const existingIds = new Set(prev.map((o) => o.id));
            const uniqueNew = mapped.filter((m) => !existingIds.has(m.id));
            const merged = [...uniqueNew, ...prev];
            if (uniqueNew[0]) {
              setSelectedOfferId(uniqueNew[0].id);
            }
            return merged;
          });
        }

        setLastScanAt(scanData.scannedAt ?? new Date().toISOString());

        if (marketRes.ok && marketData.success) {
          setMarketStats(marketData.marketStats ?? null);
          const cleanedAgencies = (marketData.agencies ?? []).map((ag) => ({
            ...ag,
            name: cleanQuotes(ag.name) || "Agence France Travail",
            phone: cleanQuotes(ag.phone),
            address: cleanQuotes(ag.address),
            city: cleanQuotes(ag.city),
          }));
          setAgencies(cleanedAgencies);
          setSelectedAgencyId(cleanedAgencies[0]?.id ?? null);
        }

        showNotice(
          `Scan terminé : ${mapped.length} résultat(s) (${contractsParam}) sur le département ${scanTerritory}.`
        );
      } catch (err: unknown) {
        showNotice(
          err instanceof Error ? err.message : "Erreur pendant le scan."
        );
      } finally {
        setIsScanning(false);
      }
    },
    [
      cv,
      cvQuickPaste,
      customRoleOrSector,
      searchedSkills,
      offeredSkillsAndPitch,
      selectedScanContracts,
      scanRome,
      scanTerritory,
      showNotice,
    ]
  );

  const visibleOffers = useMemo(() => {
    const filterTerms = [
      customRoleOrSector,
      searchedSkills,
      offeredSkillsAndPitch,
    ]
      .join(" ")
      .toLowerCase()
      .split(/[\s,;/]+/)
      .map((t) => t.trim())
      .filter((t) => t.length >= 3);

    return offers.filter((offer) => {
      if (
        selectedScanContracts.length > 0 &&
        !selectedScanContracts.includes(offer.contractType)
      ) {
        return false;
      }

      if (filterTerms.length === 0) return true;
      const haystack =
        `${offer.title} ${offer.company} ${offer.location} ${offer.description}`.toLowerCase();
      return filterTerms.some((term) => haystack.includes(term));
    });
  }, [offers, selectedScanContracts, customRoleOrSector, searchedSkills, offeredSkillsAndPitch]);

  // --- Actions CV ---
  const addSkill = (type: "technical" | "soft", raw: string) => {
    const items = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (items.length === 0) return;

    setCv((prev) => ({
      ...prev,
      skills: {
        ...prev.skills,
        [type]: Array.from(new Set([...prev.skills[type], ...items])),
      },
    }));
    if (type === "technical") setTechInput("");
    if (type === "soft") setSoftInput("");
  };

  const removeSkill = (type: "technical" | "soft", skillToRemove: string) => {
    setCv((prev) => ({
      ...prev,
      skills: {
        ...prev.skills,
        [type]: prev.skills[type].filter((s) => s !== skillToRemove),
      },
    }));
  };

  const addExperience = () => {
    setCv((prev) => ({
      ...prev,
      experiences: [
        ...prev.experiences,
        {
          id: crypto.randomUUID(),
          role: "",
          company: "",
          startDate: "",
          endDate: "",
          type: "Stage",
          highlights: [""],
        },
      ],
    }));
  };

  const updateExperience = (id: string, patch: Partial<ExperienceItem>) => {
    setCv((prev) => ({
      ...prev,
      experiences: prev.experiences.map((exp) =>
        exp.id === id ? { ...exp, ...patch } : exp
      ),
    }));
  };

  const addEducation = () => {
    setCv((prev) => ({
      ...prev,
      education: [
        ...prev.education,
        { id: crypto.randomUUID(), degree: "", school: "", period: "", details: "" },
      ],
    }));
  };

  const updateEducation = (id: string, patch: Partial<EducationItem>) => {
    setCv((prev) => ({
      ...prev,
      education: prev.education.map((edu) =>
        edu.id === id ? { ...edu, ...patch } : edu
      ),
    }));
  };

  const handleImportText = () => {
    if (!rawImportText.trim()) return;
    setCv((prev) => parseRawTextToCV(rawImportText, prev));
    showNotice("CV structuré mis à jour à partir du texte importé.");
  };

  // --- Actions Critères ---
  const toggleContract = (c: string) => {
    setCritContracts((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );
  };

  const handleAddCriteria = (e: React.FormEvent) => {
    e.preventDefault();
    if (!critLabel.trim()) return;
    const newCrit: SearchCriteria = {
      id: crypto.randomUUID(),
      label: critLabel.trim(),
      contractTypes: critContracts.length ? critContracts : ["STAGE", "ALTERNANCE"],
      keywords: critKeywords
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean),
      location: critLocation.trim(),
      maxDistanceKm: critDistance,
      maxDurationMonths: critDuration ? Number(critDuration) : undefined,
      season: critSeason.trim(),
    };
    setCriteriaList((prev) => [newCrit, ...prev]);
    setCritLabel("");
    setCritKeywords("");
    showNotice("Critère de recherche enregistré dans Trako.");
  };

  // --- Actions Offres ---
  const handleAddManualOffer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOfferTitle.trim() || !newOfferDesc.trim()) return;
    const created: JobOffer = {
      id: crypto.randomUUID(),
      title: newOfferTitle.trim(),
      company: newOfferCompany.trim() || "Entreprise",
      contractType: newOfferContract,
      location: newOfferLocation.trim() || "Non précisé",
      applyUrl: newOfferUrl.trim() || "#",
      description: newOfferDesc.trim(),
      source: "Ajout / Analyse directe",
      createdAt: new Date().toISOString(),
    };
    setOffers((prev) => [created, ...prev]);
    setSelectedOfferId(created.id);
    setNewOfferTitle("");
    setNewOfferCompany("");
    setNewOfferLocation("");
    setNewOfferUrl("");
    setNewOfferDesc("");
    showNotice("Offre analysée et ajoutée au Radar Trako !");
  };

  const selectedOffer =
    visibleOffers.find((o) => o.id === selectedOfferId) ||
    visibleOffers[0] ||
    offers.find((o) => o.id === selectedOfferId) ||
    offers[0];

  const analysis = selectedOffer
    ? analyzeAndAdaptForOffer(cv, selectedOffer, cv.city)
    : null;

  const geoAgencies = useMemo(
    () =>
      agencies.filter(
        (ag) =>
          typeof ag.latitude === "number" &&
          typeof ag.longitude === "number" &&
          Number.isFinite(ag.latitude) &&
          Number.isFinite(ag.longitude)
      ),
    [agencies]
  );

  const selectedAgency = useMemo(
    () =>
      agencies.find((ag) => ag.id === selectedAgencyId) ??
      geoAgencies[0] ??
      agencies[0] ??
      null,
    [agencies, geoAgencies, selectedAgencyId]
  );

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header Trako */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white">
              <Radar className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight">Trako</span>
          </div>

          <nav className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setActiveTab("radar")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${
                activeTab === "radar"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Briefcase className="h-4 w-4" />
              Radar d&apos;offres ({visibleOffers.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("criteria")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${
                activeTab === "criteria"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Critères ({criteriaList.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("cv")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${
                activeTab === "cv"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Sparkles className="h-4 w-4" />
              CV Studio ATS
            </button>
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void handleScanNow()}
              disabled={isScanning}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isScanning ? "animate-spin" : ""}`} />
              {isScanning ? "Scan..." : "Scanner maintenant"}
            </button>

            <button
              type="button"
              onClick={() => generateATSPdf(cv, "Trako_CV_Master_ATS.pdf")}
              className="flex items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800"
            >
              <FileDown className="h-4 w-4" />
              PDF Master ATS
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl p-6">
        {notice && (
          <div className="mb-6 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            <CheckCircle2 className="h-4 w-4" />
            {notice}
          </div>
        )}

        {/* ==================== ONGLET 1 : RADAR D'OFFRES ==================== */}
        {activeTab === "radar" && (
          <div className="space-y-6">
            {/* Formulaire de scan ciblé */}
            <form
              onSubmit={(e) => void handleScanNow(e)}
              className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Formulaire de scan intelligent (Stage, Alternance, CDI, CDD, Autre)
                  </h2>
                  <p className="text-xs text-slate-500">
                    Croise ton CV, tes compétences proposées, ce que tu recherches et le territoire choisi.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                  {marketStats?.accessRatePercent !== null &&
                    marketStats?.accessRatePercent !== undefined && (
                      <span className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-800">
                        Accès emploi (6m) : {marketStats.accessRatePercent}%
                      </span>
                    )}
                  {marketStats?.hiringCount !== null &&
                    marketStats?.hiringCount !== undefined && (
                      <span className="rounded-full bg-blue-50 px-3 py-1 font-semibold text-blue-800">
                        Embauches : {marketStats.hiringCount.toLocaleString("fr-FR")}
                      </span>
                    )}
                  <button
                    type="button"
                    onClick={() => setShowAgenciesPanel((v) => !v)}
                    className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-slate-50 px-3 py-1 font-semibold text-slate-800 hover:bg-slate-100"
                  >
                    <Building2 className="h-3.5 w-3.5" />
                    Agences ({agencies.length})
                  </button>
                  {lastScanAt && (
                    <span>MAJ : {new Date(lastScanAt).toLocaleTimeString("fr-FR")}</span>
                  )}
                </div>
              </div>

              {/* Choix du type de recherche / contrat */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="mr-1 text-xs font-semibold text-slate-700">
                  Type de recherche :
                </span>
                {CONTRACT_OPTIONS.map((contract) => {
                  const active = selectedScanContracts.includes(contract);
                  return (
                    <button
                      key={contract}
                      type="button"
                      onClick={() => toggleScanContract(contract)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                        active
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {contract}
                    </button>
                  );
                })}
              </div>

              {/* Métier ROME + Département complet + Métier/Secteur libre */}
              <div className="grid gap-3 md:grid-cols-3">
                <select
                  value={scanRome}
                  onChange={(e) => setScanRome(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white p-2 text-sm"
                >
                  {ROME_OPTIONS.map((r) => (
                    <option key={r.code} value={r.code}>
                      {r.label}
                    </option>
                  ))}
                </select>

                <select
                  value={scanTerritory}
                  onChange={(e) => setScanTerritory(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white p-2 text-sm"
                >
                  {ALL_DEPARTMENTS.map((d) => (
                    <option key={d.code} value={d.code}>
                      {d.code} — {d.name}
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  placeholder="Métier / Secteur visé (ex: Data, Web, Énergie...)"
                  value={customRoleOrSector}
                  onChange={(e) => setCustomRoleOrSector(e.target.value)}
                  className="rounded-lg border border-slate-300 p-2 text-sm"
                />
              </div>

              {/* Compétences recherchées + Ce que tu proposes / Compétences */}
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  type="text"
                  placeholder="Compétences / missions recherchées (ex: Python, SQL, React, Gestion de projet...)"
                  value={searchedSkills}
                  onChange={(e) => setSearchedSkills(e.target.value)}
                  className="rounded-lg border border-slate-300 p-2 text-sm"
                />
                <input
                  type="text"
                  placeholder="Ce que tu proposes / tes atouts (ex: Autonomie, Python, 2 projets data...)"
                  value={offeredSkillsAndPitch}
                  onChange={(e) => setOfferedSkillsAndPitch(e.target.value)}
                  className="rounded-lg border border-slate-300 p-2 text-sm"
                />
              </div>

              {/* Collage rapide CV + Bouton synchroniser CV + Bouton Scanner */}
              <div className="grid gap-3 md:grid-cols-12">
                <textarea
                  rows={2}
                  value={cvQuickPaste}
                  onChange={(e) => setCvQuickPaste(e.target.value)}
                  placeholder="Optionnel : colle ici un extrait de ton CV ou de ce que tu recherches pour alimenter le scan..."
                  className="rounded-lg border border-slate-300 p-2 text-xs md:col-span-7"
                />
                <div className="flex flex-wrap items-center justify-end gap-2 md:col-span-5">
                  <button
                    type="button"
                    onClick={applyCvToScanForm}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100"
                  >
                    <UserCheck className="h-3.5 w-3.5 text-blue-600" />
                    Utiliser mon CV
                  </button>
                  <button
                    type="submit"
                    disabled={isScanning}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isScanning ? "animate-spin" : ""}`} />
                    {isScanning ? "Scan en cours..." : "Scanner maintenant"}
                  </button>
                </div>
              </div>

              {showAgenciesPanel && (
                <div className="space-y-3 border-t border-slate-200 pt-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                    <span className="font-semibold text-slate-800">
                      Carte OpenStreetMap — Département {scanTerritory} ({geoAgencies.length} géolocalisées / {agencies.length} trouvées)
                    </span>
                    {selectedAgency &&
                      typeof selectedAgency.latitude === "number" &&
                      typeof selectedAgency.longitude === "number" && (
                        <a
                          href={`https://www.openstreetmap.org/?mlat=${selectedAgency.latitude}&mlon=${selectedAgency.longitude}#map=14/${selectedAgency.latitude}/${selectedAgency.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:underline"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Ouvrir dans OpenStreetMap
                        </a>
                      )}
                  </div>

                  <div className="grid gap-4 md:grid-cols-12">
                    <div className="md:col-span-7">
                      <AgenciesLeafletMap
                        agencies={agencies}
                        selectedAgencyId={selectedAgency?.id ?? null}
                        onSelectAgency={(id) => setSelectedAgencyId(id)}
                      />
                    </div>

                    <div className="flex max-h-72 flex-col md:col-span-5">
                      {selectedAgency && (
                        <div className="mb-2.5 shrink-0 rounded-xl border border-blue-200 bg-blue-50/70 p-3 text-xs">
                          <div className="font-bold text-blue-950">
                            {selectedAgency.name}
                          </div>
                          {(selectedAgency.address ||
                            selectedAgency.postalCode ||
                            selectedAgency.city) && (
                            <div className="mt-1 flex items-start gap-1 text-blue-900">
                              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-700" />
                              <span>
                                {[
                                  selectedAgency.address,
                                  selectedAgency.postalCode,
                                  selectedAgency.city,
                                ]
                                  .filter(Boolean)
                                  .join(" ")}
                              </span>
                            </div>
                          )}
                          <div className="mt-1 text-[11px] text-blue-800">
                            Réf. {selectedAgency.id}
                            {selectedAgency.phone ? ` • Tél : ${selectedAgency.phone}` : ""}
                          </div>
                        </div>
                      )}

                      <div className="flex-1 space-y-1.5 overflow-y-auto pr-1">
                        {agencies.map((ag) => {
                          const isSelected = selectedAgency?.id === ag.id;
                          return (
                            <button
                              key={ag.id}
                              type="button"
                              onClick={() => setSelectedAgencyId(ag.id)}
                              className={`w-full rounded-lg border px-3 py-2 text-left text-xs transition ${
                                isSelected
                                  ? "border-blue-500 bg-blue-50"
                                  : "border-slate-200 bg-white hover:bg-slate-50"
                              }`}
                            >
                              <div className="font-semibold text-slate-900">
                                {ag.name}
                              </div>
                              <div className="mt-0.5 flex flex-wrap items-center justify-between gap-1 text-[11px] text-slate-500">
                                <span>
                                  {[ag.postalCode, ag.city].filter(Boolean).join(" ") ||
                                    ag.id}
                                </span>
                                {ag.phone && <span>{ag.phone}</span>}
                              </div>
                            </button>
                          );
                        })}

                        {agencies.length === 0 && (
                          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
                            Aucune agence chargée pour le moment.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </form>

            <div className="grid gap-6 lg:grid-cols-12">
              {/* Colonne gauche : Liste des offres filtrées + Analyse rapide */}
              <div className="space-y-4 lg:col-span-5">
                <div className="space-y-2">
                  <h2 className="text-base font-semibold text-slate-800">
                    Offres traquées & analysées ({visibleOffers.length})
                  </h2>

                  {offers.length > visibleOffers.length && (
                    <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50/70 px-3 py-2 text-xs text-blue-900">
                      <span>
                        {offers.length - visibleOffers.length} résultat(s) masqué(s) par les filtres.
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedScanContracts([...CONTRACT_OPTIONS])}
                        className="font-semibold underline hover:text-blue-700"
                      >
                        Tout afficher
                      </button>
                    </div>
                  )}

                  {visibleOffers.map((offer) => {
                    const preview = analyzeAndAdaptForOffer(cv, offer, cv.city);
                    const isSelected = offer.id === selectedOffer?.id;
                    return (
                      <button
                        key={offer.id}
                        type="button"
                        onClick={() => setSelectedOfferId(offer.id)}
                        className={`w-full rounded-xl border p-4 text-left transition ${
                          isSelected
                            ? "border-blue-600 bg-blue-50/40 shadow-sm"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="inline-block rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                              {offer.contractType}
                            </span>
                            <h3 className="mt-1 font-semibold text-slate-900">
                              {offer.title}
                            </h3>
                            <p className="text-xs text-slate-600">
                              {offer.company} • {offer.location}
                            </p>
                          </div>
                          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
                            {preview.score}%
                          </span>
                        </div>
                      </button>
                    );
                  })}

                  {visibleOffers.length === 0 && (
                    <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-600">
                      Aucune offre ne correspond aux filtres sélectionnés ({selectedScanContracts.join(", ") || "tous"}). Clique sur &quot;Tout afficher&quot; ou lance un scan.
                    </div>
                  )}
                </div>

                {/* Formulaire d'analyse d'une offre trouvée sur le web */}
                <form
                  onSubmit={handleAddManualOffer}
                  className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <h3 className="text-sm font-semibold">
                    Analyser une offre (coller une annonce)
                  </h3>
                  <input
                    type="text"
                    required
                    placeholder="Intitulé du poste"
                    value={newOfferTitle}
                    onChange={(e) => setNewOfferTitle(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-sm"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Entreprise (ex: EDF)"
                      value={newOfferCompany}
                      onChange={(e) => setNewOfferCompany(e.target.value)}
                      className="rounded-lg border border-slate-300 p-2 text-sm"
                    />
                    <select
                      value={newOfferContract}
                      onChange={(e) => setNewOfferContract(e.target.value)}
                      className="rounded-lg border border-slate-300 p-2 text-sm"
                    >
                      {CONTRACT_OPTIONS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Ville / Télétravail"
                      value={newOfferLocation}
                      onChange={(e) => setNewOfferLocation(e.target.value)}
                      className="rounded-lg border border-slate-300 p-2 text-sm"
                    />
                    <input
                      type="url"
                      placeholder="Lien de candidature (URL)"
                      value={newOfferUrl}
                      onChange={(e) => setNewOfferUrl(e.target.value)}
                      className="rounded-lg border border-slate-300 p-2 text-sm"
                    />
                  </div>
                  <textarea
                    rows={3}
                    required
                    placeholder="Colle la description de l'offre ici..."
                    value={newOfferDesc}
                    onChange={(e) => setNewOfferDesc(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-sm"
                  />
                  <button
                    type="submit"
                    className="w-full rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    Analyser &amp; Générer la fiche
                  </button>
                </form>
              </div>

              {/* Colonne droite : Fiche récapitulative complète de l'offre */}
              <div className="lg:col-span-7">
                {selectedOffer && analysis ? (
                  <div className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700">
                            {selectedOffer.contractType}
                          </span>
                          {selectedOffer.duration && (
                            <span className="text-xs text-slate-500">
                              Durée : {selectedOffer.duration}
                            </span>
                          )}
                        </div>
                        <h2 className="mt-1 text-xl font-bold">{selectedOffer.title}</h2>
                        <p className="text-sm text-slate-600">
                          {selectedOffer.company} — {selectedOffer.location}
                        </p>
                      </div>

                      <div className="text-right">
                        <div className="text-2xl font-extrabold text-emerald-600">
                          {analysis.score}%
                        </div>
                        <div className="text-xs text-slate-500">Compatibilité CV</div>
                      </div>
                    </div>

                    {/* Aperçu de l'adaptation ATS fidèle au profil */}
                    <div className="space-y-1.5 rounded-lg border border-blue-100 bg-blue-50/40 p-4 text-xs">
                      <div className="font-semibold text-blue-950">
                        Aperçu CV adapté ATS (100 % fidèle au profil) — Titre ciblé :{" "}
                        <span className="font-bold">{analysis.adaptedCV.targetTitle}</span>
                      </div>
                      <p className="leading-relaxed text-slate-700">
                        {analysis.adaptedCV.summary}
                      </p>
                      {analysis.adaptedCV.skills.technical.length > 0 && (
                        <div className="pt-1 text-[11px] text-slate-600">
                          <strong className="text-slate-800">
                            Ordre priorisé des compétences techniques :{" "}
                          </strong>
                          {analysis.adaptedCV.skills.technical.join(" • ")}
                        </div>
                      )}
                    </div>

                    {/* Boutons d'action immédiats */}
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          generateATSPdf(
                            analysis.adaptedCV,
                            `Trako_CV_${selectedOffer.company.replace(/\s+/g, "_")}.pdf`
                          );
                          showNotice("CV adapté à cette offre téléchargé au format ATS !");
                        }}
                        className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                      >
                        <Sparkles className="h-4 w-4" />
                        Reformuler &amp; Télécharger CV pour cette offre
                      </button>

                      <Link
                        href={`/offers/${encodeURIComponent(selectedOffer.id)}`}
                        className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-800 hover:bg-blue-100"
                      >
                        Fiche complète &amp; CV ATS
                      </Link>

                      <a
                        href={selectedOffer.applyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Ouvrir la page de candidature
                      </a>
                    </div>

                    {/* Ce que tu apportes vs Ce qui manque */}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4">
                        <h3 className="text-sm font-semibold text-emerald-900">
                          Ce que tu apportes (Acquis)
                        </h3>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {analysis.yourStrengths.length > 0 ? (
                            analysis.yourStrengths.map((s) => (
                              <span
                                key={s}
                                className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-900"
                              >
                                {s}
                              </span>
                            ))
                          ) : (
                            <p className="text-xs text-slate-600">
                              Ajoute tes compétences dans l&apos;onglet CV Studio ATS pour voir tes correspondances.
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
                        <h3 className="text-sm font-semibold text-amber-900">
                          Demandé / À anticiper (à ne pas inventer)
                        </h3>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {analysis.missingSkills.length > 0 ? (
                            analysis.missingSkills.map((s) => (
                              <span
                                key={s}
                                className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-900"
                              >
                                {s}
                              </span>
                            ))
                          ) : (
                            <p className="text-xs text-slate-600">
                              Tous les mots-clés détectés sont couverts !
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Points positifs & négatifs */}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                          <ThumbsUp className="h-4 w-4 text-emerald-600" />
                          Points positifs
                        </h3>
                        <ul className="list-disc space-y-1 pl-5 text-xs text-slate-700">
                          {analysis.pros.map((p, idx) => (
                            <li key={idx}>{p}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="space-y-1.5">
                        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                          <AlertTriangle className="h-4 w-4 text-amber-600" />
                          Points de vigilance
                        </h3>
                        <ul className="list-disc space-y-1 pl-5 text-xs text-slate-700">
                          {analysis.cons.map((c, idx) => (
                            <li key={idx}>{c}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Logistique & Estimation Budget */}
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                        <Wallet className="h-4 w-4 text-blue-600" />
                        Logistique &amp; Estimation Budget mensuel
                      </h3>
                      <div className="mt-2 grid grid-cols-3 gap-3 text-center">
                        <div className="rounded border border-slate-200 bg-white p-2.5">
                          <div className="text-xs text-slate-500">Revenu / Indemnité est.</div>
                          <div className="text-sm font-bold text-emerald-700">
                            +{analysis.budgetAndLogistics.estimatedIncome} €
                          </div>
                        </div>
                        <div className="rounded border border-slate-200 bg-white p-2.5">
                          <div className="text-xs text-slate-500">Coût trajet / logement</div>
                          <div className="text-sm font-bold text-rose-600">
                            -{analysis.budgetAndLogistics.estimatedCost} €
                          </div>
                        </div>
                        <div className="rounded border border-slate-200 bg-white p-2.5">
                          <div className="text-xs text-slate-500">Reste estimé</div>
                          <div className="text-sm font-bold text-slate-900">
                            {analysis.budgetAndLogistics.netBalance} € / mois
                          </div>
                        </div>
                      </div>
                      <p className="mt-2.5 flex items-center gap-1.5 text-xs text-slate-600">
                        <MapPin className="h-3.5 w-3.5 text-slate-500" />
                        {analysis.budgetAndLogistics.summary}
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {/* ==================== ONGLET 2 : CRITÈRES DE RECHERCHE ==================== */}
        {activeTab === "criteria" && (
          <div className="mx-auto max-w-3xl space-y-6">
            <form
              onSubmit={handleAddCriteria}
              className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h2 className="text-lg font-semibold">
                Configurer une alerte / recherche automatique Trako
              </h2>
              <input
                type="text"
                required
                placeholder="Nom de la recherche (ex: Stage Ingénieur / Alternance Data)"
                value={critLabel}
                onChange={(e) => setCritLabel(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm"
              />

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Types de contrats recherchés</label>
                <div className="flex flex-wrap gap-2">
                  {CONTRACT_OPTIONS.map((c) => {
                    const active = critContracts.includes(c);
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => toggleContract(c)}
                        className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                          active
                            ? "bg-blue-600 text-white"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <input
                  type="text"
                  placeholder="Mots-clés / Domaines (séparés par virgules)"
                  value={critKeywords}
                  onChange={(e) => setCritKeywords(e.target.value)}
                  className="rounded-lg border border-slate-300 p-2.5 text-sm"
                />
                <input
                  type="text"
                  placeholder="Ville / Région (ex: Lille, Paris, France)"
                  value={critLocation}
                  onChange={(e) => setCritLocation(e.target.value)}
                  className="rounded-lg border border-slate-300 p-2.5 text-sm"
                />
                <input
                  type="number"
                  placeholder="Durée max (en mois, ex: 6)"
                  value={critDuration}
                  onChange={(e) => setCritDuration(e.target.value)}
                  className="rounded-lg border border-slate-300 p-2.5 text-sm"
                />
                <input
                  type="text"
                  placeholder="Période / Saison (ex: Printemps 2027, Dès maintenant)"
                  value={critSeason}
                  onChange={(e) => setCritSeason(e.target.value)}
                  className="rounded-lg border border-slate-300 p-2.5 text-sm"
                />
              </div>

              <div>
                <label className="text-xs text-slate-600">
                  Distance maximale : <strong>{critDistance} km</strong>
                </label>
                <input
                  type="range"
                  min={5}
                  max={200}
                  step={5}
                  value={critDistance}
                  onChange={(e) => setCritDistance(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Enregistrer ce radar
              </button>
            </form>

            {/* Liste des radars enregistrés */}
            <div className="space-y-3">
              {criteriaList.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4"
                >
                  <div>
                    <div className="font-semibold">{item.label}</div>
                    <div className="mt-1 flex flex-wrap gap-1.5 text-xs text-slate-600">
                      <span className="font-medium text-blue-700">
                        {item.contractTypes.join(", ")}
                      </span>
                      {item.location && <span>• {item.location} ({item.maxDistanceKm} km)</span>}
                      {item.maxDurationMonths && <span>• {item.maxDurationMonths} mois</span>}
                      {item.season && <span>• {item.season}</span>}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setCriteriaList((prev) => prev.filter((x) => x.id !== item.id))
                    }
                    className="text-xs text-red-600 hover:underline"
                  >
                    Supprimer
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ==================== ONGLET 3 : CV STUDIO ATS ==================== */}
        {activeTab === "cv" && (
          <div className="mx-auto max-w-4xl space-y-8">
            <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 font-semibold">
                <Sparkles className="h-4 w-4 text-blue-600" />
                <span>Importer un CV existant (copier-coller du texte)</span>
              </div>
              <textarea
                rows={4}
                value={rawImportText}
                onChange={(e) => setRawImportText(e.target.value)}
                placeholder="Colle ici le contenu de ton CV actuel..."
                className="w-full rounded-lg border border-slate-300 p-3 text-sm"
              />
              <button
                type="button"
                onClick={handleImportText}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Extraire vers mon profil Trako
              </button>
            </section>

            <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold">1. Identité &amp; Objectif</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <input
                  type="text"
                  placeholder="Nom complet"
                  value={cv.fullName}
                  onChange={(e) => setCv({ ...cv, fullName: e.target.value })}
                  className="rounded-lg border border-slate-300 p-2.5 text-sm"
                />
                <input
                  type="text"
                  placeholder="Titre / Poste recherché"
                  value={cv.targetTitle}
                  onChange={(e) => setCv({ ...cv, targetTitle: e.target.value })}
                  className="rounded-lg border border-slate-300 p-2.5 text-sm"
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={cv.email}
                  onChange={(e) => setCv({ ...cv, email: e.target.value })}
                  className="rounded-lg border border-slate-300 p-2.5 text-sm"
                />
                <input
                  type="text"
                  placeholder="Téléphone"
                  value={cv.phone || ""}
                  onChange={(e) => setCv({ ...cv, phone: e.target.value })}
                  className="rounded-lg border border-slate-300 p-2.5 text-sm"
                />
                <input
                  type="text"
                  placeholder="Ville de départ (sert au calcul budget/trajet)"
                  value={cv.city || ""}
                  onChange={(e) => setCv({ ...cv, city: e.target.value })}
                  className="rounded-lg border border-slate-300 p-2.5 text-sm"
                />
                <input
                  type="text"
                  placeholder="LinkedIn / Portfolio / GitHub"
                  value={cv.linkedinOrPortfolio || ""}
                  onChange={(e) =>
                    setCv({ ...cv, linkedinOrPortfolio: e.target.value })
                  }
                  className="rounded-lg border border-slate-300 p-2.5 text-sm"
                />
              </div>
              <textarea
                rows={3}
                placeholder="Accroche : ce que tu sais faire, ce que tu apportes, tes disponibilités..."
                value={cv.summary}
                onChange={(e) => setCv({ ...cv, summary: e.target.value })}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm"
              />
            </section>

            <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold">2. Compétences &amp; Acquis</h2>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Compétences techniques / outils (séparées par des virgules)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={techInput}
                    onChange={(e) => setTechInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addSkill("technical", techInput);
                      }
                    }}
                    placeholder="Ex: Python, SQL, React, Excel..."
                    className="flex-1 rounded-lg border border-slate-300 p-2.5 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => addSkill("technical", techInput)}
                    className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium hover:bg-slate-200"
                  >
                    Ajouter
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {cv.skills.technical.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-800"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => removeSkill("technical", skill)}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Savoir-être / Atouts humains
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={softInput}
                    onChange={(e) => setSoftInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addSkill("soft", softInput);
                      }
                    }}
                    placeholder="Ex: Autonomie, Rigueur, Travail d'équipe..."
                    className="flex-1 rounded-lg border border-slate-300 p-2.5 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => addSkill("soft", softInput)}
                    className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium hover:bg-slate-200"
                  >
                    Ajouter
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {cv.skills.soft.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-800"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => removeSkill("soft", skill)}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </section>

            <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">3. Expériences &amp; Projets</h2>
                <button
                  type="button"
                  onClick={addExperience}
                  className="flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Ajouter
                </button>
              </div>
              {cv.experiences.map((exp) => (
                <div key={exp.id} className="space-y-3 rounded-lg border border-slate-200 p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      type="text"
                      placeholder="Rôle / Intitulé"
                      value={exp.role}
                      onChange={(e) => updateExperience(exp.id, { role: e.target.value })}
                      className="rounded-lg border border-slate-300 p-2 text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Entreprise / Organisation"
                      value={exp.company}
                      onChange={(e) => updateExperience(exp.id, { company: e.target.value })}
                      className="rounded-lg border border-slate-300 p-2 text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Date début"
                      value={exp.startDate}
                      onChange={(e) => updateExperience(exp.id, { startDate: e.target.value })}
                      className="rounded-lg border border-slate-300 p-2 text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Date fin"
                      value={exp.endDate}
                      onChange={(e) => updateExperience(exp.id, { endDate: e.target.value })}
                      className="rounded-lg border border-slate-300 p-2 text-sm"
                    />
                  </div>
                  <textarea
                    rows={3}
                    placeholder="Une réalisation / tâche par ligne..."
                    value={exp.highlights.join("\n")}
                    onChange={(e) =>
                      updateExperience(exp.id, { highlights: e.target.value.split("\n") })
                    }
                    className="w-full rounded-lg border border-slate-300 p-2 text-sm"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        setCv((prev) => ({
                          ...prev,
                          experiences: prev.experiences.filter((x) => x.id !== exp.id),
                        }))
                      }
                      className="flex items-center gap-1 text-xs text-red-600 hover:underline"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Supprimer
                    </button>
                  </div>
                </div>
              ))}
            </section>

            <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">4. Formation</h2>
                <button
                  type="button"
                  onClick={addEducation}
                  className="flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Ajouter
                </button>
              </div>
              {cv.education.map((edu) => (
                <div key={edu.id} className="space-y-3 rounded-lg border border-slate-200 p-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <input
                      type="text"
                      placeholder="Diplôme / Formation"
                      value={edu.degree}
                      onChange={(e) => updateEducation(edu.id, { degree: e.target.value })}
                      className="rounded-lg border border-slate-300 p-2 text-sm"
                    />
                    <input
                      type="text"
                      placeholder="École / Université"
                      value={edu.school}
                      onChange={(e) => updateEducation(edu.id, { school: e.target.value })}
                      className="rounded-lg border border-slate-300 p-2 text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Période (ex: 2024 - 2027)"
                      value={edu.period}
                      onChange={(e) => updateEducation(edu.id, { period: e.target.value })}
                      className="rounded-lg border border-slate-300 p-2 text-sm"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        setCv((prev) => ({
                          ...prev,
                          education: prev.education.filter((x) => x.id !== edu.id),
                        }))
                      }
                      className="flex items-center gap-1 text-xs text-red-600 hover:underline"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Supprimer
                    </button>
                  </div>
                </div>
              ))}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}