"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  ExternalLink,
  Sparkles,
  FileDown,
  MapPin,
  Wallet,
  ThumbsUp,
  AlertTriangle,
  CheckCircle2,
  Briefcase,
  Building2,
} from "lucide-react";
import { MasterCV } from "@/types/cv";
import { JobOffer, analyzeAndAdaptForOffer } from "@/lib/trako-engine";
import { generateATSPdf } from "@/lib/ats-pdf";

const CV_STORAGE_KEY = "trako_master_cv_v1";
const OFFERS_STORAGE_KEY = "trako_offers_v1";

const EMPTY_CV: MasterCV = {
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

const FALLBACK_OFFER: JobOffer = {
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
};

interface RemoteOfferEntry {
  id: string;
  offer: JobOffer;
}

function OfferDetailContent() {
  const params = useParams<{ id: string }>();
  const offerId = decodeURIComponent(params?.id || "").trim();

  const [cv, setCv] = useState<MasterCV>(EMPTY_CV);
  const [offers, setOffers] = useState<JobOffer[]>([]);
  const [remoteEntry, setRemoteEntry] = useState<RemoteOfferEntry | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loadingForId, setLoadingForId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const savedCv = localStorage.getItem(CV_STORAGE_KEY);
        if (savedCv) {
          setCv(JSON.parse(savedCv));
        }
        const savedOffers = localStorage.getItem(OFFERS_STORAGE_KEY);
        if (savedOffers) {
          const parsed = JSON.parse(savedOffers);
          if (Array.isArray(parsed)) {
            setOffers(parsed);
          }
        }
      } catch {
        // ignore storage errors
      } finally {
        setLoaded(true);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const localOffer = useMemo(() => {
    if (!offerId) return null;
    const found = offers.find(
      (item) => (item.id || "").toLowerCase() === offerId.toLowerCase()
    );
    if (found) return found;
    if (offerId === "demo-1") return FALLBACK_OFFER;
    return null;
  }, [offers, offerId]);

  const matchedRemoteOffer = useMemo(() => {
    if (!remoteEntry || !offerId) return null;
    return remoteEntry.id.toLowerCase() === offerId.toLowerCase()
      ? remoteEntry.offer
      : null;
  }, [remoteEntry, offerId]);

  useEffect(() => {
    if (!loaded || !offerId || localOffer) return;

    let cancelled = false;

    const startTimer = window.setTimeout(() => {
      if (cancelled) return;
      setLoadingForId(offerId);

      fetch(`/api/offers/${encodeURIComponent(offerId)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data: { success?: boolean; offer?: JobOffer } | null) => {
          if (cancelled) return;
          if (data?.success && data.offer) {
            setRemoteEntry({ id: offerId, offer: data.offer });
            try {
              const current = JSON.parse(
                localStorage.getItem(OFFERS_STORAGE_KEY) || "[]"
              );
              const list = Array.isArray(current)
                ? (current as JobOffer[])
                : [];
              if (!list.some((o) => o.id === data.offer!.id)) {
                localStorage.setItem(
                  OFFERS_STORAGE_KEY,
                  JSON.stringify([data.offer, ...list].slice(0, 100))
                );
              }
            } catch {
              // ignore storage errors
            }
          }
        })
        .catch(() => {
          // ignore network errors
        })
        .finally(() => {
          if (!cancelled) {
            setLoadingForId((prev) => (prev === offerId ? null : prev));
          }
        });
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(startTimer);
    };
  }, [loaded, offerId, localOffer]);

  const offer = localOffer ?? matchedRemoteOffer;
  const isLoadingRemote = Boolean(offerId && loadingForId === offerId && !offer);

  const analysis = useMemo(() => {
    if (!offer) return null;
    return analyzeAndAdaptForOffer(cv, offer, cv.city);
  }, [cv, offer]);

  const triggerNotice = (msg: string) => {
    setNotice(msg);
    window.setTimeout(() => setNotice(""), 3500);
  };

  const handleDownloadAdaptedCv = () => {
    if (!offer || !analysis) return;
    const safeCompany = (offer.company || "Offre")
      .replace(/[^a-zA-Z0-9_-]+/g, "_")
      .replace(/^_+|_+$/g, "");
    generateATSPdf(
      analysis.adaptedCV,
      `Trako_CV_ATS_${safeCompany || "Candidature"}.pdf`
    );
    triggerNotice(
      "CV adapté (100 % fidèle à ton profil) téléchargé au format ATS."
    );
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-3.5">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour au Radar Trako
          </Link>

          {offer && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadAdaptedCv}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-700"
              >
                <FileDown className="h-4 w-4" />
                Télécharger CV adapté (ATS)
              </button>

              {offer.applyUrl && offer.applyUrl !== "#" && (
                <a
                  href={offer.applyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                >
                  <ExternalLink className="h-4 w-4" />
                  Postuler sur l&apos;offre
                </a>
              )}
            </div>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-6 p-6">
        {notice && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{notice}</span>
          </div>
        )}

        {loaded && isLoadingRemote ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
            Récupération de la fiche d&apos;offre ({offerId})...
          </div>
        ) : loaded && !offer ? (
          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">
              Offre &laquo; {offerId} &raquo; introuvable.
            </p>
            <p>
              Elle n&apos;est pas présente dans ton stockage local ni dans le scan
              courant. Lance un nouveau scan depuis le Radar Trako.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
            >
              Aller au Radar
            </Link>
          </div>
        ) : offer && analysis ? (
          <>
            {/* En-tête de l'offre */}
            <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded bg-blue-50 px-2.5 py-0.5 font-bold text-blue-700">
                      {offer.contractType}
                    </span>
                    {offer.duration && (
                      <span className="rounded bg-slate-100 px-2.5 py-0.5 font-medium text-slate-700">
                        Durée : {offer.duration}
                      </span>
                    )}
                    <span className="text-slate-500">Source : {offer.source}</span>
                  </div>

                  <h1 className="text-2xl font-bold text-slate-900">
                    {offer.title}
                  </h1>

                  <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                    <span className="inline-flex items-center gap-1.5">
                      <Building2 className="h-4 w-4 text-slate-400" />
                      {offer.company}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 text-slate-400" />
                      {offer.location}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Briefcase className="h-4 w-4 text-slate-400" />
                      Réf. {offer.id}
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3 text-right">
                  <div className="text-3xl font-extrabold text-emerald-700">
                    {analysis.score}%
                  </div>
                  <div className="text-xs font-medium text-emerald-900">
                    Compatibilité avec ton CV
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h2 className="text-sm font-semibold text-slate-900">
                  Description &amp; missions récupérées
                </h2>
                <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">
                  {offer.description}
                </p>
              </div>
            </section>

            {/* Compétences alignées vs écarts honnêtes */}
            <section className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-emerald-200 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-bold text-emerald-950">
                  Ce que tu as déjà sur ton CV (Validé)
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Uniquement les compétences/atouts présents dans ton profil actuel.
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {analysis.yourStrengths.length > 0 ? (
                    analysis.yourStrengths.map((item) => (
                      <span
                        key={item}
                        className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-900"
                      >
                        {item}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-600">
                      Aucune correspondance directe détectée pour l&apos;instant. Complète
                      ton CV dans l&apos;onglet CV Studio ATS.
                    </span>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-amber-200 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-bold text-amber-950">
                  Points demandés non présents sur ton CV (À ne pas inventer)
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  À mentionner uniquement si tu les maîtrises réellement et à préparer
                  en entretien.
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {analysis.missingSkills.length > 0 ? (
                    analysis.missingSkills.map((item) => (
                      <span
                        key={item}
                        className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-950"
                      >
                        {item}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-600">
                      Tous les mots-clés repérés dans l&apos;offre figurent déjà dans ton
                      profil.
                    </span>
                  )}
                </div>
              </div>
            </section>

            {/* Points positifs, vigilance et budget mensuel */}
            <section className="grid gap-4 md:grid-cols-2">
              <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div>
                  <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                    <ThumbsUp className="h-4 w-4 text-emerald-600" />
                    Atouts de l&apos;offre
                  </h3>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-700">
                    {analysis.pros.map((pro, idx) => (
                      <li key={idx}>{pro}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    Points de vigilance
                  </h3>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-700">
                    {analysis.cons.map((con, idx) => (
                      <li key={idx}>{con}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                  <Wallet className="h-4 w-4 text-blue-600" />
                  Logistique &amp; Estimation Budget mensuel
                </h3>
                <div className="grid grid-cols-3 gap-2.5 text-center">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                    <div className="text-[11px] text-slate-500">Revenu est.</div>
                    <div className="text-sm font-bold text-emerald-700">
                      +{analysis.budgetAndLogistics.estimatedIncome} €
                    </div>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                    <div className="text-[11px] text-slate-500">Coût est.</div>
                    <div className="text-sm font-bold text-rose-600">
                      -{analysis.budgetAndLogistics.estimatedCost} €
                    </div>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                    <div className="text-[11px] text-slate-500">Reste est.</div>
                    <div className="text-sm font-bold text-slate-900">
                      {analysis.budgetAndLogistics.netBalance} €
                    </div>
                  </div>
                </div>
                <p className="text-xs leading-relaxed text-slate-600">
                  {analysis.budgetAndLogistics.summary}
                </p>
              </div>
            </section>

            {/* Adaptation fidèle du CV */}
            <section className="space-y-4 rounded-xl border border-blue-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
                    <Sparkles className="h-4 w-4 text-blue-600" />
                    Adaptation de ton CV pour cette offre (sans mensonge)
                  </h2>
                  <p className="text-xs text-slate-500">
                    Réordonne tes compétences et expériences réelles selon l&apos;offre, sans
                    ajouter d&apos;éléments absents de ton profil.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleDownloadAdaptedCv}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                >
                  <FileDown className="h-4 w-4" />
                  Générer le PDF ATS adapté
                </button>
              </div>

              <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs">
                <div>
                  <span className="font-semibold text-slate-900">
                    Intitulé ciblé :{" "}
                  </span>
                  <span className="text-blue-800 font-medium">
                    {analysis.adaptedCV.targetTitle}
                  </span>
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
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}

export default function OfferDetailPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-50 p-6 text-sm text-slate-600">
          Chargement de la fiche d&apos;offre...
        </main>
      }
    >
      <OfferDetailContent />
    </Suspense>
  );
}