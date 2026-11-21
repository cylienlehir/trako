"use client";

import React, { useEffect, useState } from "react";
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
} from "lucide-react";
import { MasterCV, ExperienceItem, EducationItem } from "@/types/cv";
import { generateATSPdf } from "@/lib/ats-pdf";
import {
  SearchCriteria,
  JobOffer,
  analyzeAndAdaptForOffer,
} from "@/lib/trako-engine";

const CV_STORAGE_KEY = "trako_master_cv_v1";
const CRITERIA_STORAGE_KEY = "trako_criteria_v1";
const OFFERS_STORAGE_KEY = "trako_offers_v1";

const CONTRACT_OPTIONS = ["STAGE", "ALTERNANCE", "CDI", "CDD", "INTERIM"];

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

export default function TrakoApp() {
  const [activeTab, setActiveTab] = useState<"radar" | "cv" | "criteria">("radar");
  const [cv, setCv] = useState<MasterCV>(INITIAL_CV);
  const [criteriaList, setCriteriaList] = useState<SearchCriteria[]>([]);
  const [offers, setOffers] = useState<JobOffer[]>(SAMPLE_OFFERS);
  const [selectedOfferId, setSelectedOfferId] = useState<string>("demo-1");

  // États formulaire CV
  const [techInput, setTechInput] = useState("");
  const [softInput, setSoftInput] = useState("");
  const [rawImportText, setRawImportText] = useState("");
  const [notice, setNotice] = useState("");

  // États formulaire Critères
  const [critLabel, setCritLabel] = useState("");
  const [critContracts, setCritContracts] = useState<string[]>(["STAGE"]);
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

  useEffect(() => {
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

  const showNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(""), 3000);
  };

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
      contractTypes: critContracts.length ? critContracts : ["STAGE"],
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

  const selectedOffer = offers.find((o) => o.id === selectedOfferId) || offers[0];
  const analysis = selectedOffer
    ? analyzeAndAdaptForOffer(cv, selectedOffer, cv.city)
    : null;

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
              Radar d&apos;offres ({offers.length})
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

          <button
            type="button"
            onClick={() => generateATSPdf(cv, "Trako_CV_Master_ATS.pdf")}
            className="flex items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800"
          >
            <FileDown className="h-4 w-4" />
            PDF Master ATS
          </button>
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
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Colonne gauche : Liste des offres + Analyse rapide */}
            <div className="space-y-4 lg:col-span-5">
              <div className="space-y-2">
                <h2 className="text-base font-semibold text-slate-800">
                  Offres traquées & analysées
                </h2>
                {offers.map((offer) => {
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
                  Analyser & Générer la fiche
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
                      Reformuler & Télécharger CV pour cette offre
                    </button>

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
                        Demandé / À anticiper
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
                      Logistique & Estimation Budget mensuel
                    </h3>
                    <div className="mt-2 grid grid-cols-3 gap-3 text-center">
                      <div className="rounded bg-white p-2.5 border border-slate-200">
                        <div className="text-xs text-slate-500">Revenu / Indemnité est.</div>
                        <div className="text-sm font-bold text-emerald-700">
                          +{analysis.budgetAndLogistics.estimatedIncome} €
                        </div>
                      </div>
                      <div className="rounded bg-white p-2.5 border border-slate-200">
                        <div className="text-xs text-slate-500">Coût trajet / logement</div>
                        <div className="text-sm font-bold text-rose-600">
                          -{analysis.budgetAndLogistics.estimatedCost} €
                        </div>
                      </div>
                      <div className="rounded bg-white p-2.5 border border-slate-200">
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
              <h2 className="text-lg font-semibold">1. Identité & Objectif</h2>
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
              <h2 className="text-lg font-semibold">2. Compétences & Acquis</h2>
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
                <h2 className="text-lg font-semibold">3. Expériences & Projets</h2>
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