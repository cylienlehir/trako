export interface ExperienceItem {
  id: string;
  role: string;
  company: string;
  location?: string;
  startDate: string;
  endDate: string;
  type?: "Stage" | "Alternance" | "Projet" | "Emploi" | "Bénévolat";
  highlights: string[];
}

export interface EducationItem {
  id: string;
  degree: string;
  school: string;
  location?: string;
  period: string;
  details?: string;
}

export interface MasterCV {
  fullName: string;
  targetTitle: string;
  email: string;
  phone?: string;
  city?: string;
  linkedinOrPortfolio?: string;
  summary: string;
  skills: {
    technical: string[];
    soft: string[];
    languages: string[];
  };
  experiences: ExperienceItem[];
  education: EducationItem[];
}