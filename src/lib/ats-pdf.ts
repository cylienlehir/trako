import { jsPDF } from "jspdf";
import { MasterCV } from "@/types/cv";

function sanitizeText(text: string): string {
  return text
    .replace(/’/g, "'")
    .replace(/“|”/g, '"')
    .replace(/–|—/g, "-")
    .replace(/•/g, "-");
}

export function generateATSPdf(cv: MasterCV, filename = "Trako_CV_ATS.pdf"): void {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 45;
  const maxWidth = pageWidth - margin * 2;
  let y = 48;

  const ensureSpace = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - 40) {
      doc.addPage();
      y = 48;
    }
  };

  const addSectionTitle = (title: string) => {
    ensureSpace(28);
    y += 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(20, 20, 20);
    doc.text(sanitizeText(title.toUpperCase()), margin, y);
    y += 4;
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.7);
    doc.line(margin, y, pageWidth - margin, y);
    y += 14;
  };

  const addWrappedParagraph = (
    text: string,
    fontSize = 10,
    style: "normal" | "bold" | "italic" = "normal",
    indent = 0,
    lineHeight = 14
  ) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(fontSize);
    doc.setTextColor(35, 35, 35);
    const lines = doc.splitTextToSize(sanitizeText(text), maxWidth - indent);
    ensureSpace(lines.length * lineHeight + 4);
    doc.text(lines, margin + indent, y);
    y += lines.length * lineHeight;
  };

  // En-tête
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(15, 15, 15);
  doc.text(sanitizeText(cv.fullName || "Candidat"), margin, y);
  y += 18;

  if (cv.targetTitle) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(55, 65, 81);
    doc.text(sanitizeText(cv.targetTitle), margin, y);
    y += 15;
  }

  const contactParts = [
    cv.email,
    cv.phone,
    cv.city,
    cv.linkedinOrPortfolio,
  ].filter(Boolean);

  if (contactParts.length > 0) {
    addWrappedParagraph(contactParts.join("  |  "), 9.5, "normal", 0, 13);
    y += 2;
  }

  // Profil
  if (cv.summary?.trim()) {
    addSectionTitle("Profil");
    addWrappedParagraph(cv.summary.trim(), 10, "normal", 0, 14);
  }

  // Compétences
  const hasSkills =
    cv.skills.technical.length > 0 ||
    cv.skills.soft.length > 0 ||
    cv.skills.languages.length > 0;

  if (hasSkills) {
    addSectionTitle("Competences");
    if (cv.skills.technical.length > 0) {
      addWrappedParagraph(
        `Techniques & Outils : ${cv.skills.technical.join(", ")}`,
        10,
        "normal",
        0,
        14
      );
    }
    if (cv.skills.soft.length > 0) {
      addWrappedParagraph(
        `Savoir-etre : ${cv.skills.soft.join(", ")}`,
        10,
        "normal",
        0,
        14
      );
    }
    if (cv.skills.languages.length > 0) {
      addWrappedParagraph(
        `Langues : ${cv.skills.languages.join(", ")}`,
        10,
        "normal",
        0,
        14
      );
    }
  }

  // Expériences et Projets
  if (cv.experiences.length > 0) {
    addSectionTitle("Experiences et Projets");
    for (const exp of cv.experiences) {
      ensureSpace(34);
      const headerLine = `${exp.role} - ${exp.company}${
        exp.location ? ` (${exp.location})` : ""
      }`;
      addWrappedParagraph(headerLine, 10.5, "bold", 0, 14);

      const metaLine = [exp.type, `${exp.startDate} - ${exp.endDate}`]
        .filter(Boolean)
        .join(" | ");
      if (metaLine) {
        addWrappedParagraph(metaLine, 9, "italic", 0, 12);
      }

      for (const bullet of exp.highlights) {
        if (bullet.trim()) {
          addWrappedParagraph(`- ${bullet.trim()}`, 9.8, "normal", 10, 13.5);
        }
      }
      y += 6;
    }
  }

  // Formation
  if (cv.education.length > 0) {
    addSectionTitle("Formation");
    for (const edu of cv.education) {
      ensureSpace(28);
      addWrappedParagraph(`${edu.degree} - ${edu.school}`, 10.5, "bold", 0, 14);
      const eduMeta = [edu.period, edu.location].filter(Boolean).join(" | ");
      if (eduMeta) {
        addWrappedParagraph(eduMeta, 9, "italic", 0, 12);
      }
      if (edu.details?.trim()) {
        addWrappedParagraph(edu.details.trim(), 9.8, "normal", 0, 13.5);
      }
      y += 6;
    }
  }

  doc.save(filename);
}