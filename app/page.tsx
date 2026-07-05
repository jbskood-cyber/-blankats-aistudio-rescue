"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Download,
  Sparkles,
  RefreshCw,
  FileWarning,
  PlusCircle,
  Info,
  Lock,
  Check,
  Loader2
} from "lucide-react";

interface ImprovedCV {
  name: string;
  title: string;
  contact: string;
  summary: string;
  experience: {
    company: string;
    role: string;
    period: string;
    bullets: string[];
    description?: string;
  }[];
  education: {
    institution: string;
    degree: string;
    period: string;
    description?: string;
  }[];
  skills: string[];
  projects?: {
    name: string;
    bullets: string[];
    period?: string;
    description?: string;
  }[];
  certifications?: string[];
}

interface AnalysisResponse {
  score: number;
  qualityStatus: "green" | "yellow" | "red";
  processingMode: "PRESERVE_AND_POLISH" | "RESTRUCTURE_AND_IMPROVE" | "REVIEW_REQUIRED";
  recommendedAction: "download_ready" | "review_before_download" | "request_better_input";
  extractionWarnings: string[];
  dataIntegrityWarnings: string[];
  problems: string[];
  missingSections: string[];
  recommendations: string[];
  improvedCV: ImprovedCV;
  deliveryDecision: {
    allowDownload: boolean;
    showWarningBeforeDownload: boolean;
    userMessage: string;
  };
}

function sanitizeImprovedCV(cv: any): ImprovedCV {
  if (!cv) {
    return {
      name: "",
      title: "",
      contact: "",
      summary: "",
      experience: [],
      education: [],
      skills: [],
    };
  }

  const cleanText = (text: string | undefined): string => {
    if (!text) return "";
    let t = text;
    // Remove any text in square brackets [Sugerencia...] or similar
    t = t.replace(/\[[^\]]*\]/g, "");
    // Remove common placeholders
    t = t.replace(/pendiente/gi, "");
    t = t.replace(/agregar aquí/gi, "");
    t = t.replace(/\bn\/a\b/gi, "");
    t = t.replace(/placeholder/gi, "");
    // Clean up multiple spaces and clean trailing/leading spaces
    t = t.replace(/\s\s+/g, " ").trim();
    return t;
  };

  const sanitizeBullets = (bullets: any[] | undefined, descriptionFallback: string | undefined): string[] => {
    let rawList: string[] = [];
    if (Array.isArray(bullets) && bullets.length > 0) {
      rawList = bullets.map(b => String(b));
    } else if (descriptionFallback) {
      // Convert description string to bullets
      let cleaned = descriptionFallback
        .replace(/\.-/g, "\n")
        .replace(/ • /g, "\n")
        .replace(/ \s*-\s* /g, "\n")
        .replace(/•/g, "\n");
      rawList = cleaned.split("\n");
    }

    return rawList
      .map(line => {
        let l = line.trim();
        // Remove brackets and suggestions from bullet
        l = l.replace(/\[[^\]]*\]/g, "");
        l = l.replace(/pendiente/gi, "");
        l = l.replace(/agregar aquí/gi, "");
        l = l.replace(/\bn\/a\b/gi, "");
        l = l.replace(/placeholder/gi, "");
        // Remove leading dashes/bullets
        if (l.startsWith("-") || l.startsWith("•") || l.startsWith("*") || l.startsWith(".")) {
          l = l.substring(1).trim();
        }
        return l.trim();
      })
      .filter(line => line.length > 0);
  };

  const cleanExperience = Array.isArray(cv.experience)
    ? cv.experience.map((exp: any) => ({
        company: cleanText(exp.company),
        role: cleanText(exp.role),
        period: cleanText(exp.period),
        bullets: sanitizeBullets(exp.bullets, exp.description),
      }))
    : [];

  const cleanEducation = Array.isArray(cv.education)
    ? cv.education.map((edu: any) => ({
        institution: cleanText(edu.institution),
        degree: cleanText(edu.degree),
        period: cleanText(edu.period),
        description: edu.description ? cleanText(edu.description) : undefined,
      }))
    : [];

  const cleanProjects = Array.isArray(cv.projects)
    ? cv.projects.map((proj: any) => ({
        name: cleanText(proj.name),
        period: proj.period ? cleanText(proj.period) : undefined,
        bullets: sanitizeBullets(proj.bullets, proj.description),
      }))
    : [];

  const cleanSkills = Array.isArray(cv.skills)
    ? cv.skills.map((s: any) => cleanText(String(s))).filter((s: string) => s.length > 0)
    : [];

  const cleanCertifications = Array.isArray(cv.certifications)
    ? cv.certifications.map((c: any) => cleanText(String(c))).filter((c: string) => c.length > 0)
    : [];

  return {
    name: cleanText(cv.name),
    title: cleanText(cv.title),
    contact: cleanText(cv.contact),
    summary: cleanText(cv.summary),
    experience: cleanExperience,
    education: cleanEducation,
    skills: cleanSkills,
    projects: cleanProjects.length > 0 ? cleanProjects : undefined,
    certifications: cleanCertifications.length > 0 ? cleanCertifications : undefined,
  };
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [useTextMode, setUseTextMode] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResponse | null>(null);

  // Helper to format file size beautifully and accurately
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(2)} MB`;
  };

  // File drag & drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === "application/pdf") {
        setFile(droppedFile);
        setError(null);
      } else {
        setError("Por favor, sube únicamente archivos en formato PDF.");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type === "application/pdf") {
        setFile(selectedFile);
        setError(null);
      } else {
        setError("Por favor, sube únicamente archivos en formato PDF.");
      }
    }
  };

  // Convert PDF file to Base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        if (result) {
          const base64 = result.split(",")[1];
          resolve(base64 || "");
        } else {
          reject(new Error("No se pudo leer el archivo."));
        }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };

  // Start analysis
  const handleAnalyze = async () => {
    if (!file && !pastedText.trim()) {
      setError("Por favor, sube un archivo PDF o ingresa el texto de tu CV.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setLoadingStep(0);

    // Dynamic loading text updates
    const firstStepLabel = file ? "Extrayendo texto del PDF" : "Procesando texto del CV";
    const loadingIntervals = [
      firstStepLabel,
      "Analizando contenido y redacción",
      "Optimizando formato y estructura",
      "Generando CV mejorado"
    ];

    const timer = setInterval(() => {
      setLoadingStep((prev) => {
        if (prev < loadingIntervals.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 3000);

    try {
      let base64Data = "";
      if (file) {
        base64Data = await fileToBase64(file);
      }

      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pdfBase64: base64Data || undefined,
          originalText: pastedText || undefined,
        }),
      });

      if (!response.ok) {
        let errMsg = "Ocurrió un error inesperado.";
        try {
          const errJson = await response.json();
          errMsg = errJson.error || errMsg;
        } catch (e) {
          errMsg = `Error del servidor (${response.status}): ${response.statusText || "Error interno"}`;
        }
        throw new Error(errMsg);
      }

      const data: AnalysisResponse = await response.json();
      if (data && data.improvedCV) {
        data.improvedCV = sanitizeImprovedCV(data.improvedCV);
      }
      setResult(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "No se pudo completar el análisis del CV.");
    } finally {
      clearInterval(timer);
      setIsLoading(false);
    }
  };

  // Trigger dynamic PDF download using jsPDF client side
  const handleDownloadPDF = async () => {
    if (!result) return;

    if (result.deliveryDecision && !result.deliveryDecision.allowDownload) {
      alert(result.deliveryDecision.userMessage || "La descarga no está permitida para este documento.");
      return;
    }

    if (result.deliveryDecision && result.deliveryDecision.showWarningBeforeDownload) {
      const confirmDownload = confirm(result.deliveryDecision.userMessage || "¿Está seguro de descargar este documento? Contiene advertencias de lectura.");
      if (!confirmDownload) return;
    }
    
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF("p", "pt", "a4");
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 50;
      const contentWidth = pageWidth - margin * 2;
      let currentY = 50;

      // Approved Color Palette (BlankATS Clean Executive V1)
      const colorName = [17, 24, 39];      // #111827 (casi negro)
      const colorBody = [17, 24, 39];      // #111827 (casi negro)
      const colorHeading = [15, 23, 42];   // #0F172A (casi negro)
      const colorMuted = [55, 65, 81];     // #374151 (gris oscuro)
      const colorLine = [209, 213, 219];   // #D1D5DB (gris claro)

      // Helper to add clean lines of text and auto-wrap / auto-page-break
      const addText = (text: string, size: number, style: "normal" | "bold" | "italic" = "normal", spacing = 13.5) => {
        doc.setFont("helvetica", style);
        doc.setFontSize(size);
        doc.setTextColor(colorBody[0], colorBody[1], colorBody[2]);
        
        const lines = doc.splitTextToSize(text, contentWidth);
        const totalHeight = lines.length * spacing;
        
        if (currentY + totalHeight > pageHeight - margin) {
          doc.addPage();
          currentY = margin + 10;
        }
        
        lines.forEach((line: string) => {
          doc.text(line, margin, currentY);
          currentY += spacing;
        });
      };

      // Helper for elegant section headers with solid thin lines
      const addSectionHeader = (title: string) => {
        if (currentY + 32 > pageHeight - margin) {
          doc.addPage();
          currentY = margin + 10;
        } else {
          currentY += 15;
        }
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(colorHeading[0], colorHeading[1], colorHeading[2]);
        doc.text(title.toUpperCase(), margin, currentY);
        currentY += 4;
        
        // Solid thin gray line below section header
        doc.setDrawColor(colorLine[0], colorLine[1], colorLine[2]);
        doc.setLineWidth(0.75);
        doc.line(margin, currentY, pageWidth - margin, currentY);
        currentY += 12;
      };

      const cv = result.improvedCV;

      // Name (Main Header)
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(colorName[0], colorName[1], colorName[2]);
      const nameText = cv.name.toUpperCase();
      const nameLines = doc.splitTextToSize(nameText, contentWidth);
      nameLines.forEach((line: string) => {
        if (currentY + 24 > pageHeight - margin) {
          doc.addPage();
          currentY = margin + 10;
        }
        doc.text(line, margin, currentY);
        currentY += 24;
      });

      // Title
      if (cv.title) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11.5);
        doc.setTextColor(colorMuted[0], colorMuted[1], colorMuted[2]);
        const titleText = cv.title.toUpperCase();
        const titleLines = doc.splitTextToSize(titleText, contentWidth);
        titleLines.forEach((line: string) => {
          if (currentY + 15 > pageHeight - margin) {
            doc.addPage();
            currentY = margin + 10;
          }
          doc.text(line, margin, currentY);
          currentY += 14;
        });
      }

      // Contact
      if (cv.contact) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(colorMuted[0], colorMuted[1], colorMuted[2]);
        const contactLines = doc.splitTextToSize(cv.contact, contentWidth);
        contactLines.forEach((line: string) => {
          if (currentY + 13 > pageHeight - margin) {
            doc.addPage();
            currentY = margin + 10;
          }
          doc.text(line, margin, currentY);
          currentY += 12;
        });
      }

      currentY += 5;

      // Professional Summary
      if (cv.summary) {
        addSectionHeader("RESUMEN PROFESIONAL");
        addText(cv.summary, 9.5, "normal", 13.5);
      }

      // Work Experience
      if (cv.experience && cv.experience.length > 0) {
        addSectionHeader("EXPERIENCIA LABORAL");

        cv.experience.forEach((exp) => {
          if (currentY + 30 > pageHeight - margin) {
            doc.addPage();
            currentY = margin + 10;
          }

          const periodText = exp.period || "";
          const roleText = exp.role || "";
          const companyText = exp.company || "";

          // Measure to prevent overlapping
          doc.setFont("helvetica", "bold");
          doc.setFontSize(10);
          const rWidth = doc.getTextWidth(roleText);

          doc.setFont("helvetica", "normal");
          const cWidth = doc.getTextWidth(` — ${companyText}`);

          doc.setFont("helvetica", "italic");
          doc.setFontSize(9);
          const pWidth = doc.getTextWidth(periodText);

          const totalTextWidth = rWidth + cWidth;
          const maxLeftWidth = contentWidth - pWidth - 15; // 15pt safety gap

          // Check if Role, Company and Period fit on a single line
          if (totalTextWidth <= maxLeftWidth) {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            doc.setTextColor(colorHeading[0], colorHeading[1], colorHeading[2]);
            doc.text(roleText, margin, currentY);

            doc.setFont("helvetica", "normal");
            doc.setTextColor(colorMuted[0], colorMuted[1], colorMuted[2]);
            doc.text(` — ${companyText}`, margin + rWidth, currentY);

            doc.setFont("helvetica", "italic");
            doc.setFontSize(9);
            doc.setTextColor(colorMuted[0], colorMuted[1], colorMuted[2]);
            doc.text(periodText, pageWidth - margin - pWidth, currentY);
            currentY += 14;
          } else {
            // Overlap risk: Split into structured lines
            // Line 1: Role in Bold
            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            doc.setTextColor(colorHeading[0], colorHeading[1], colorHeading[2]);
            
            const roleLines = doc.splitTextToSize(roleText, contentWidth);
            roleLines.forEach((line: string) => {
              if (currentY + 14 > pageHeight - margin) {
                doc.addPage();
                currentY = margin + 10;
              }
              doc.text(line, margin, currentY);
              currentY += 13;
            });

            // Line 2: Company and Period
            doc.setFont("helvetica", "normal");
            doc.setFontSize(9.5);
            const compWidthOnly = doc.getTextWidth(companyText);
            const compAndPeriodFit = compWidthOnly + pWidth < contentWidth - 15;

            if (currentY + 14 > pageHeight - margin) {
              doc.addPage();
              currentY = margin + 10;
            }

            if (compAndPeriodFit) {
              doc.setFont("helvetica", "normal");
              doc.setTextColor(colorMuted[0], colorMuted[1], colorMuted[2]);
              doc.text(companyText, margin, currentY);

              doc.setFont("helvetica", "italic");
              doc.setFontSize(9);
              doc.setTextColor(colorMuted[0], colorMuted[1], colorMuted[2]);
              doc.text(periodText, pageWidth - margin - pWidth, currentY);
              currentY += 14;
            } else {
              // Extremely long company or period, separate them entirely
              doc.setFont("helvetica", "normal");
              doc.setTextColor(colorMuted[0], colorMuted[1], colorMuted[2]);
              
              const companyLines = doc.splitTextToSize(companyText, contentWidth);
              companyLines.forEach((line: string) => {
                if (currentY + 14 > pageHeight - margin) {
                  doc.addPage();
                  currentY = margin + 10;
                }
                doc.text(line, margin, currentY);
                currentY += 13;
              });

              if (currentY + 14 > pageHeight - margin) {
                doc.addPage();
                currentY = margin + 10;
              }
              doc.setFont("helvetica", "italic");
              doc.setFontSize(9);
              doc.setTextColor(colorMuted[0], colorMuted[1], colorMuted[2]);
              doc.text(periodText, margin, currentY);
              currentY += 14;
            }
          }

          // Render bullets
          const bullets = exp.bullets || [];
          bullets.forEach((bullet) => {
            let cleanBullet = bullet.trim();
            if (cleanBullet.startsWith("-") || cleanBullet.startsWith("•") || cleanBullet.startsWith("*")) {
              cleanBullet = cleanBullet.substring(1).trim();
            }

            doc.setFont("helvetica", "normal");
            doc.setFontSize(9.5);
            doc.setTextColor(colorBody[0], colorBody[1], colorBody[2]);

            const bulletLines = doc.splitTextToSize(cleanBullet, contentWidth - 18);
            const bulletHeight = bulletLines.length * 13;
            
            if (currentY + bulletHeight > pageHeight - margin) {
              doc.addPage();
              currentY = margin + 10;
            }

            // Draw bullet character
            doc.setTextColor(colorMuted[0], colorMuted[1], colorMuted[2]);
            doc.text("•", margin + 8, currentY + 1.5);
            doc.setTextColor(colorBody[0], colorBody[1], colorBody[2]);

            bulletLines.forEach((line: string) => {
              doc.text(line, margin + 18, currentY);
              currentY += 13;
            });
          });
          currentY += 4;
        });
      }

      // Education
      if (cv.education && cv.education.length > 0) {
        addSectionHeader("EDUCACIÓN");

        cv.education.forEach((edu) => {
          if (currentY + 30 > pageHeight - margin) {
            doc.addPage();
            currentY = margin + 10;
          }

          const degreeText = edu.degree || "";
          const institutionText = edu.institution || "";
          const periodText = edu.period || "";

          // Measure to prevent overlapping
          doc.setFont("helvetica", "bold");
          doc.setFontSize(10);
          const dWidth = doc.getTextWidth(degreeText);

          doc.setFont("helvetica", "normal");
          const iWidth = doc.getTextWidth(` — ${institutionText}`);

          doc.setFont("helvetica", "italic");
          doc.setFontSize(9);
          const pWidth = doc.getTextWidth(periodText);

          const totalEduTextWidth = dWidth + iWidth;
          const maxLeftEduWidth = contentWidth - pWidth - 15;

          if (totalEduTextWidth <= maxLeftEduWidth) {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            doc.setTextColor(colorHeading[0], colorHeading[1], colorHeading[2]);
            doc.text(degreeText, margin, currentY);

            doc.setFont("helvetica", "normal");
            doc.setTextColor(colorMuted[0], colorMuted[1], colorMuted[2]);
            doc.text(` — ${institutionText}`, margin + dWidth, currentY);

            doc.setFont("helvetica", "italic");
            doc.setFontSize(9);
            doc.setTextColor(colorMuted[0], colorMuted[1], colorMuted[2]);
            doc.text(periodText, pageWidth - margin - pWidth, currentY);
            currentY += 14;
          } else {
            // Overlap risk: Split into structured lines
            // Line 1: Degree in Bold
            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            doc.setTextColor(colorHeading[0], colorHeading[1], colorHeading[2]);

            const degreeLines = doc.splitTextToSize(degreeText, contentWidth);
            degreeLines.forEach((line: string) => {
              if (currentY + 14 > pageHeight - margin) {
                doc.addPage();
                currentY = margin + 10;
              }
              doc.text(line, margin, currentY);
              currentY += 13;
            });

            // Line 2: Institution & Period
            doc.setFont("helvetica", "normal");
            doc.setFontSize(9.5);
            const instWidthOnly = doc.getTextWidth(institutionText);
            const instAndPeriodFit = instWidthOnly + pWidth < contentWidth - 15;

            if (currentY + 14 > pageHeight - margin) {
              doc.addPage();
              currentY = margin + 10;
            }

            if (instAndPeriodFit) {
              doc.setFont("helvetica", "normal");
              doc.setTextColor(colorMuted[0], colorMuted[1], colorMuted[2]);
              doc.text(institutionText, margin, currentY);

              doc.setFont("helvetica", "italic");
              doc.setFontSize(9);
              doc.setTextColor(colorMuted[0], colorMuted[1], colorMuted[2]);
              doc.text(periodText, pageWidth - margin - pWidth, currentY);
              currentY += 14;
            } else {
              // Extremely long institution, wrap it, then print period
              doc.setFont("helvetica", "normal");
              doc.setTextColor(colorMuted[0], colorMuted[1], colorMuted[2]);
              
              const instLines = doc.splitTextToSize(institutionText, contentWidth);
              instLines.forEach((line: string) => {
                if (currentY + 14 > pageHeight - margin) {
                  doc.addPage();
                  currentY = margin + 10;
                }
                doc.text(line, margin, currentY);
                currentY += 13;
              });

              if (currentY + 14 > pageHeight - margin) {
                doc.addPage();
                currentY = margin + 10;
              }
              doc.setFont("helvetica", "italic");
              doc.setFontSize(9);
              doc.setTextColor(colorMuted[0], colorMuted[1], colorMuted[2]);
              doc.text(periodText, margin, currentY);
              currentY += 14;
            }
          }

          if (edu.description) {
            addText(edu.description, 9, "normal", 12.5);
            currentY += 4;
          }
          currentY += 4;
        });
      }

      // Skills
      if (cv.skills && cv.skills.length > 0) {
        addSectionHeader("HABILIDADES");
        const skillsJoined = cv.skills.join("  •  ");
        addText(skillsJoined, 9.5, "normal", 13.5);
      }

      // Projects
      if (cv.projects && cv.projects.length > 0) {
        addSectionHeader("PROYECTOS");

        cv.projects.forEach((proj) => {
          if (currentY + 30 > pageHeight - margin) {
            doc.addPage();
            currentY = margin + 10;
          }

          const projName = proj.name || "";
          const projPeriod = proj.period || "";

          // Measure to prevent overlapping
          doc.setFont("helvetica", "bold");
          doc.setFontSize(10);
          const nWidth = doc.getTextWidth(projName);

          doc.setFont("helvetica", "italic");
          doc.setFontSize(9);
          const pWidth = projPeriod ? doc.getTextWidth(projPeriod) : 0;

          const maxLeftProjWidth = contentWidth - pWidth - 15;

          if (!projPeriod || nWidth <= maxLeftProjWidth) {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            doc.setTextColor(colorHeading[0], colorHeading[1], colorHeading[2]);
            doc.text(projName, margin, currentY);

            if (projPeriod) {
              doc.setFont("helvetica", "italic");
              doc.setFontSize(9);
              doc.setTextColor(colorMuted[0], colorMuted[1], colorMuted[2]);
              doc.text(projPeriod, pageWidth - margin - pWidth, currentY);
            }
            currentY += 14;
          } else {
            // Overlap risk: Split into structured lines
            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            doc.setTextColor(colorHeading[0], colorHeading[1], colorHeading[2]);

            const nameLines = doc.splitTextToSize(projName, contentWidth);
            nameLines.forEach((line: string) => {
              if (currentY + 14 > pageHeight - margin) {
                doc.addPage();
                currentY = margin + 10;
              }
              doc.text(line, margin, currentY);
              currentY += 13;
            });

            if (currentY + 14 > pageHeight - margin) {
              doc.addPage();
              currentY = margin + 10;
            }

            doc.setFont("helvetica", "italic");
            doc.setFontSize(9);
            doc.setTextColor(colorMuted[0], colorMuted[1], colorMuted[2]);
            doc.text(projPeriod, margin, currentY);
            currentY += 14;
          }

          const bullets = proj.bullets || [];
          bullets.forEach((bullet) => {
            let cleanBullet = bullet.trim();
            if (cleanBullet.startsWith("-") || cleanBullet.startsWith("•") || cleanBullet.startsWith("*")) {
              cleanBullet = cleanBullet.substring(1).trim();
            }

            doc.setFont("helvetica", "normal");
            doc.setFontSize(9.5);
            doc.setTextColor(colorBody[0], colorBody[1], colorBody[2]);

            const bulletLines = doc.splitTextToSize(cleanBullet, contentWidth - 18);
            const bulletHeight = bulletLines.length * 13;
            
            if (currentY + bulletHeight > pageHeight - margin) {
              doc.addPage();
              currentY = margin + 10;
            }

            // Draw bullet character
            doc.setTextColor(colorMuted[0], colorMuted[1], colorMuted[2]);
            doc.text("•", margin + 8, currentY + 1.5);
            doc.setTextColor(colorBody[0], colorBody[1], colorBody[2]);

            bulletLines.forEach((line: string) => {
              doc.text(line, margin + 18, currentY);
              currentY += 13;
            });
          });
          currentY += 4;
        });
      }

      // Certifications
      if (cv.certifications && cv.certifications.length > 0) {
        addSectionHeader("CERTIFICACIONES");

        cv.certifications.forEach((cert) => {
          if (currentY + 14 > pageHeight - margin) {
            doc.addPage();
            currentY = margin + 10;
          }
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9.5);
          doc.setTextColor(colorBody[0], colorBody[1], colorBody[2]);
          
          doc.setTextColor(colorMuted[0], colorMuted[1], colorMuted[2]);
          doc.text("•", margin + 8, currentY);
          doc.setTextColor(colorBody[0], colorBody[1], colorBody[2]);
          
          doc.text(cert, margin + 18, currentY);
          currentY += 13;
        });
      }

      // Save PDF in browser
      doc.save(`CV_Optimizado_${cv.name.replace(/\s+/g, "_")}.pdf`);
    } catch (e) {
      console.error("Error al descargar PDF:", e);
      alert("Hubo un error al generar tu PDF. Por favor intenta de nuevo.");
    }
  };

  // Trigger dynamic DOCX download using docx library client side
  const handleDownloadDOCX = async () => {
    if (!result) return;

    if (result.deliveryDecision && !result.deliveryDecision.allowDownload) {
      alert(result.deliveryDecision.userMessage || "La descarga no está permitida para este documento.");
      return;
    }

    if (result.deliveryDecision && result.deliveryDecision.showWarningBeforeDownload) {
      const confirmDownload = confirm(result.deliveryDecision.userMessage || "¿Está seguro de descargar este documento? Contiene advertencias de lectura.");
      if (!confirmDownload) return;
    }

    try {
      const {
        Document,
        Packer,
        Paragraph,
        TextRun,
        AlignmentType,
        BorderStyle,
        Table,
        TableRow,
        TableCell,
        WidthType
      } = await import("docx");

      const cv = result.improvedCV;
      const docChildren: any[] = [];

      // Helper to create Section Header with a thin bottom line
      const createSectionHeader = (title: string) => {
        return new Paragraph({
          spacing: { before: 300, after: 160 }, // 15pt before, 8pt after
          border: {
            bottom: {
              color: "D1D5DB",
              space: 6, // 6pt space
              style: BorderStyle.SINGLE,
              size: 6, // 0.75pt line thickness
            }
          },
          children: [
            new TextRun({
              text: title.toUpperCase(),
              bold: true,
              size: 22, // 11pt
              font: "Arial",
              color: "0F172A",
            })
          ]
        });
      };

      // Helper to create Body Paragraph
      const createBodyParagraph = (text: string) => {
        return new Paragraph({
          spacing: { after: 120, line: 270 }, // 6pt after, 13.5pt line spacing
          children: [
            new TextRun({
              text,
              size: 19, // 9.5pt
              font: "Arial",
              color: "111827",
            })
          ]
        });
      };

      // Helper to create right-aligned period rows using borderless table
      const borderlessTableBorders = {
        top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
        bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
        left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
        right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
        insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
        insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      };

      const createHeaderPeriodRow = (boldText: string, regularText: string, periodText: string, isFirst: boolean = false) => {
        return new Table({
          width: {
            size: 100,
            type: WidthType.PERCENTAGE,
          },
          borders: borderlessTableBorders,
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 75, type: WidthType.PERCENTAGE },
                  margins: { top: 0, bottom: 0, left: 0, right: 0 },
                  children: [
                    new Paragraph({
                      spacing: { before: isFirst ? 0 : 160, after: 60 },
                      children: [
                        new TextRun({
                          text: boldText,
                          bold: true,
                          size: 20, // 10pt
                          font: "Arial",
                          color: "0F172A",
                        }),
                        regularText ? new TextRun({
                          text: ` — ${regularText}`,
                          size: 20, // 10pt
                          font: "Arial",
                          color: "374151",
                        }) : new TextRun(""),
                      ],
                    }),
                  ],
                }),
                new TableCell({
                  width: { size: 25, type: WidthType.PERCENTAGE },
                  margins: { top: 0, bottom: 0, left: 0, right: 0 },
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.RIGHT,
                      spacing: { before: isFirst ? 0 : 160, after: 60 },
                      children: [
                        new TextRun({
                          text: periodText,
                          italics: true,
                          size: 18, // 9pt
                          font: "Arial",
                          color: "374151",
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
          ],
        });
      };

      // 1. Name
      docChildren.push(
        new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: { after: 120 },
          children: [
            new TextRun({
              text: cv.name.toUpperCase(),
              bold: true,
              size: 44, // 22pt
              font: "Arial",
              color: "111827",
            }),
          ],
        })
      );

      // 2. Title
      if (cv.title) {
        docChildren.push(
          new Paragraph({
            alignment: AlignmentType.LEFT,
            spacing: { after: 80 },
            children: [
              new TextRun({
                text: cv.title.toUpperCase(),
                bold: true,
                size: 23, // 11.5pt
                font: "Arial",
                color: "374151",
              }),
            ],
          })
        );
      }

      // 3. Contact
      if (cv.contact) {
        docChildren.push(
          new Paragraph({
            alignment: AlignmentType.LEFT,
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: cv.contact,
                size: 19, // 9.5pt
                font: "Arial",
                color: "374151",
              }),
            ],
          })
        );
      }

      // 4. Summary
      if (cv.summary) {
        docChildren.push(createSectionHeader("RESUMEN PROFESIONAL"));
        docChildren.push(createBodyParagraph(cv.summary));
      }

      // 5. Experience
      if (cv.experience && cv.experience.length > 0) {
        docChildren.push(createSectionHeader("EXPERIENCIA LABORAL"));
        cv.experience.forEach((exp, idx) => {
          docChildren.push(createHeaderPeriodRow(exp.role || "", exp.company || "", exp.period || "", idx === 0));
          
          if (exp.description) {
            docChildren.push(new Paragraph({
              spacing: { after: 80, line: 270 },
              children: [
                new TextRun({
                  text: exp.description,
                  size: 19, // 9.5pt
                  font: "Arial",
                  color: "111827",
                })
              ]
            }));
          }

          if (exp.bullets && exp.bullets.length > 0) {
            exp.bullets.forEach((bullet) => {
              let cleanBullet = bullet.trim();
              if (cleanBullet.startsWith("-") || cleanBullet.startsWith("•") || cleanBullet.startsWith("*")) {
                cleanBullet = cleanBullet.substring(1).trim();
              }
              docChildren.push(
                new Paragraph({
                  indent: { left: 360, hanging: 200 }, // left margin 18pt, bullet bullet starts at 8pt (160 twips)
                  spacing: { after: 60, line: 270 }, // 3pt after, 13.5pt line spacing
                  children: [
                    new TextRun({
                      text: "•\t",
                      bold: true,
                      size: 19, // 9.5pt
                      font: "Arial",
                      color: "374151",
                    }),
                    new TextRun({
                      text: cleanBullet,
                      size: 19, // 9.5pt
                      font: "Arial",
                      color: "111827",
                    }),
                  ],
                })
              );
            });
          }
        });
      }

      // 6. Education
      if (cv.education && cv.education.length > 0) {
        docChildren.push(createSectionHeader("EDUCACIÓN"));
        cv.education.forEach((edu, idx) => {
          docChildren.push(createHeaderPeriodRow(edu.degree || "", edu.institution || "", edu.period || "", idx === 0));
          
          if (edu.description) {
            docChildren.push(new Paragraph({
              spacing: { after: 80, line: 250 },
              children: [
                new TextRun({
                  text: edu.description,
                  size: 18, // 9pt
                  font: "Arial",
                  color: "374151",
                })
              ]
            }));
          }
        });
      }

      // 7. Skills
      if (cv.skills && cv.skills.length > 0) {
        docChildren.push(createSectionHeader("HABILIDADES"));
        const skillsJoined = cv.skills.join("  •  ");
        docChildren.push(createBodyParagraph(skillsJoined));
      }

      // 8. Projects
      if (cv.projects && cv.projects.length > 0) {
        docChildren.push(createSectionHeader("PROYECTOS"));
        cv.projects.forEach((proj, idx) => {
          docChildren.push(createHeaderPeriodRow(proj.name || "", "", proj.period || "", idx === 0));
          
          if (proj.description) {
            docChildren.push(new Paragraph({
              spacing: { after: 80, line: 270 },
              children: [
                new TextRun({
                  text: proj.description,
                  size: 19, // 9.5pt
                  font: "Arial",
                  color: "111827",
                })
              ]
            }));
          }

          if (proj.bullets && proj.bullets.length > 0) {
            proj.bullets.forEach((bullet) => {
              let cleanBullet = bullet.trim();
              if (cleanBullet.startsWith("-") || cleanBullet.startsWith("•") || cleanBullet.startsWith("*")) {
                cleanBullet = cleanBullet.substring(1).trim();
              }
              docChildren.push(
                new Paragraph({
                  indent: { left: 360, hanging: 200 },
                  spacing: { after: 60, line: 270 },
                  children: [
                    new TextRun({
                      text: "•\t",
                      bold: true,
                      size: 19, // 9.5pt
                      font: "Arial",
                      color: "374151",
                    }),
                    new TextRun({
                      text: cleanBullet,
                      size: 19, // 9.5pt
                      font: "Arial",
                      color: "111827",
                    }),
                  ],
                })
              );
            });
          }
        });
      }

      // 9. Certifications
      if (cv.certifications && cv.certifications.length > 0) {
        docChildren.push(createSectionHeader("CERTIFICACIONES"));
        cv.certifications.forEach((cert) => {
          docChildren.push(
            new Paragraph({
              indent: { left: 360, hanging: 200 },
              spacing: { after: 60, line: 270 },
              children: [
                new TextRun({
                  text: "•\t",
                  bold: true,
                  size: 19, // 9.5pt
                  font: "Arial",
                  color: "374151",
                }),
                new TextRun({
                  text: cert,
                  size: 19, // 9.5pt
                  font: "Arial",
                  color: "111827",
                }),
              ],
            })
          );
        });
      }

      // Build Document
      const doc = new Document({
        sections: [
          {
            properties: {
              page: {
                margin: {
                  top: 1000, // 50pt margin (matches PDF)
                  right: 1000,
                  bottom: 1000,
                  left: 1000,
                }
              }
            },
            children: docChildren,
          }
        ]
      });

      // Generate blob and download in browser
      const blob = await Packer.toBlob(doc);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `CV_Optimizado_${cv.name.replace(/\s+/g, "_")}.docx`;
      a.click();
      window.URL.revokeObjectURL(url);

    } catch (e) {
      console.error("Error al descargar DOCX:", e);
      alert("Hubo un error al generar tu documento Word. Por favor intenta de nuevo.");
    }
  };

  const handleReset = () => {
    setFile(null);
    setPastedText("");
    setResult(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 px-4 py-3 md:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Logo */}
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transform transition-transform hover:scale-110"
              >
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <polyline points="14 2 14 8 20 8" />
                <path d="M10 13l3 3-3 3" />
                <line x1="8" y1="16" x2="13" y2="16" />
              </svg>
            </div>
            <div>
              <span className="font-bold text-xl tracking-tight text-slate-900 font-display">
                Blank<span className="text-blue-600">ATS</span>
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-1 rounded-md hidden sm:inline-block">
              v1.0 (Demo ATS)
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        <AnimatePresence mode="wait">
          {!result ? (
            /* STAGE 1: UPLOAD / INPUT FORM */
            <motion.div
              key="input-stage"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="max-w-2xl mx-auto"
            >
              <div className="text-center mb-8 md:mb-12">
                <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-3 font-display">
                  Mejora tu CV antes de enviarlo
                </h1>
                <p className="text-base md:text-lg text-slate-600 max-w-lg mx-auto">
                  Convertimos tu CV actual en una versión profesional, clara y fácil de revisar para reclutadores y procesos digitales.
                </p>
              </div>

              {/* Selector de modo: Archivo PDF vs Texto Pegado */}
              <div className="flex bg-slate-150 p-1 rounded-xl mb-6 max-w-sm mx-auto border border-slate-200">
                <button
                  type="button"
                  onClick={() => { setUseTextMode(false); setError(null); }}
                  className={`flex-1 py-2 text-xs md:text-sm font-medium rounded-lg transition-all ${
                    !useTextMode
                      ? "bg-white text-blue-600 shadow-sm border border-slate-200/50"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Sube archivo PDF
                </button>
                <button
                  type="button"
                  onClick={() => { setUseTextMode(true); setError(null); }}
                  className={`flex-1 py-2 text-xs md:text-sm font-medium rounded-lg transition-all ${
                    useTextMode
                      ? "bg-white text-blue-600 shadow-sm border border-slate-200/50"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Pegar texto del CV
                </button>
              </div>

              {/* Area de Carga o Pegado */}
              <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-200/60 mb-6">
                {!useTextMode ? (
                  /* PDF File Dropzone */
                  <div
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    className={`relative border-2 border-dashed rounded-xl p-8 md:p-12 text-center transition-all ${
                      dragActive
                        ? "border-blue-500 bg-blue-50/50"
                        : file
                        ? "border-emerald-400 bg-emerald-50/10"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="file"
                      accept=".pdf"
                      id="cv-upload-input"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={handleFileChange}
                      disabled={isLoading}
                    />

                    <div className="flex flex-col items-center justify-center">
                      <div className={`p-4 rounded-full mb-4 ${file ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-400"}`}>
                        <Upload className="w-8 h-8" />
                      </div>

                      {file ? (
                        <div>
                          <p className="text-base font-semibold text-slate-800 break-all px-4">
                            {file.name}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            {formatFileSize(file.size)} • PDF Listo para analizar
                          </p>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setFile(null);
                            }}
                            className="mt-3 text-xs text-rose-500 font-medium hover:underline"
                          >
                            Eliminar archivo
                          </button>
                        </div>
                      ) : (
                        <div>
                          <p className="text-base font-semibold text-slate-800">
                            Arrastra tu CV aquí o <span className="text-blue-600 hover:underline">haz clic para explorar</span>
                          </p>
                          <p className="text-xs text-slate-400 mt-1.5">
                            Formato admitido: PDF (máx. 10MB)
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Text Paste Area */
                  <div>
                    <label htmlFor="pasted-cv-textarea" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      Contenido actual de tu CV
                    </label>
                    <textarea
                      id="pasted-cv-textarea"
                      rows={10}
                      className="w-full rounded-xl border border-slate-200 p-4 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
                      placeholder="Pega aquí toda la información de tu CV (Nombre, Experiencia, Estudios, etc.)..."
                      value={pastedText}
                      onChange={(e) => setPastedText(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                )}

                {/* Mensaje de Error */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 flex items-start gap-3 p-3.5 rounded-xl bg-rose-50 text-rose-700 text-sm border border-rose-100"
                  >
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Error de archivo</p>
                      <p className="text-xs opacity-90">{error}</p>
                    </div>
                  </motion.div>
                )}

                {/* Botón Principal */}
                <div className="mt-8">
                  <button
                    onClick={handleAnalyze}
                    disabled={isLoading || (!file && !pastedText.trim())}
                    className={`w-full py-4 px-6 rounded-xl font-bold text-white shadow-sm flex items-center justify-center gap-2.5 transition-all text-base md:text-lg ${
                      isLoading
                        ? "bg-blue-400 cursor-not-allowed"
                        : (!file && !pastedText.trim())
                        ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700 active:scale-[0.99] hover:shadow-md"
                    }`}
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span>Analizando tu CV...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        <span>Analizar mi CV</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Loading State Feedback */}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/95 backdrop-blur-md rounded-2xl p-6 md:p-8 border border-slate-200 shadow-xl max-w-xl mx-auto mt-8 text-left relative overflow-hidden"
                >
                  {/* Subtle decorative backing glow */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 rounded-full blur-2xl pointer-events-none -z-10" />

                  {/* Header with Title & Overall Progress */}
                  <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 font-display uppercase tracking-wider flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-blue-500 animate-pulse" />
                        Optimizando tu CV
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        BlankATS está reconstruyendo tu currículum paso a paso.
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-extrabold text-blue-600 font-mono">
                        {Math.min(Math.round(((loadingStep + 1) / 4) * 100), 100)}%
                      </span>
                    </div>
                  </div>

                  {/* Overall Progress Bar */}
                  <div className="w-full bg-slate-100 h-2 rounded-full mb-8 overflow-hidden">
                    <motion.div
                      className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full"
                      initial={{ width: "0%" }}
                      animate={{ width: `${((loadingStep + 1) / 4) * 100}%` }}
                      transition={{ duration: 0.5, ease: "easeInOut" }}
                    />
                  </div>

                  {/* Steps Timeline Stack */}
                  <div className="space-y-6 relative pl-4">
                    {/* Line running behind the steps */}
                    <div className="absolute top-2 bottom-2 left-[23px] w-0.5 bg-slate-100" />

                    {[
                      {
                        id: 0,
                        label: file ? "Extrayendo texto del PDF" : "Procesando texto del CV",
                        desc: "Extrayendo y estructurando el texto original de tu documento.",
                      },
                      {
                        id: 1,
                        label: "Analizando contenido y redacción",
                        desc: "Evaluando la claridad de tus logros, verbos de acción e impacto profesional.",
                      },
                      {
                        id: 2,
                        label: "Optimizando formato y estructura",
                        desc: "Estructurando secciones clave para maximizar la legibilidad digital y ATS.",
                      },
                      {
                        id: 3,
                        label: "Generando CV mejorado",
                        desc: "Redactando sugerencias optimizadas y puliendo la versión Clean Executive.",
                      }
                    ].map((step) => {
                      const isCompleted = loadingStep > step.id;
                      const isActive = loadingStep === step.id;
                      const isPending = loadingStep < step.id;

                      return (
                        <div key={step.id} className="relative flex gap-4 items-start group">
                          {/* Step Icon Indicator */}
                          <div className="relative z-10 flex items-center justify-center">
                            {isCompleted ? (
                              <motion.div
                                initial={{ scale: 0.8 }}
                                animate={{ scale: 1 }}
                                className="w-5 h-5 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-600 flex items-center justify-center shadow-xs"
                              >
                                <Check className="w-3 h-3 stroke-[3]" />
                              </motion.div>
                            ) : isActive ? (
                              <motion.div
                                animate={{ scale: [1, 1.05, 1] }}
                                transition={{ repeat: Infinity, duration: 2 }}
                                className="w-5 h-5 rounded-full bg-blue-100 border border-blue-400 text-blue-600 flex items-center justify-center shadow-md relative"
                              >
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span className="absolute -inset-1 rounded-full bg-blue-400/20 animate-ping -z-10" />
                              </motion.div>
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-slate-50 border border-slate-200 text-slate-300 flex items-center justify-center">
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                              </div>
                            )}
                          </div>

                          {/* Step Content */}
                          <div className="flex-1 min-w-0 -mt-0.5">
                            <h4
                              className={`text-sm font-bold transition-colors duration-300 font-display ${
                                isActive
                                  ? "text-blue-600"
                                  : isCompleted
                                  ? "text-slate-800"
                                  : "text-slate-400"
                              }`}
                            >
                              {step.label}
                              {isActive && (
                                <span className="ml-2.5 text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full inline-block animate-pulse">
                                  Procesando...
                                </span>
                              )}
                            </h4>
                            <p
                              className={`text-xs mt-1 transition-colors duration-300 ${
                                isActive
                                  ? "text-slate-600 font-medium"
                                  : isCompleted
                                  ? "text-slate-500"
                                  : "text-slate-350"
                              }`}
                            >
                              {step.desc}
                            </p>

                            {/* Micro-interactive local progress bar just for the ACTIVE step */}
                            {isActive && (
                              <div className="mt-3 w-32 bg-slate-100 h-1 rounded-full overflow-hidden relative">
                                <motion.div
                                  className="bg-blue-500 h-full rounded-full absolute left-0"
                                  animate={{
                                    left: ["-100%", "100%"],
                                  }}
                                  transition={{
                                    repeat: Infinity,
                                    duration: 1.5,
                                    ease: "easeInOut",
                                  }}
                                  style={{ width: "50%" }}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Footer with small timing info */}
                  <div className="mt-8 pt-4 border-t border-slate-100 text-center flex items-center justify-center gap-2">
                    <Info className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-[11px] text-slate-400 font-medium">
                      El análisis de IA profunda suele tardar entre 10 y 15 segundos. Por favor, mantén esta ventana abierta.
                    </span>
                  </div>
                </motion.div>
              )}
            </motion.div>
          ) : (
            /* STAGE 2: RESULTS & PREVIEW */
            <motion.div
              key="results-stage"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              {/* Header de Resultados */}
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm">
                <div>
                  <div className="flex items-center gap-2.5 text-xs font-semibold text-blue-600 mb-1.5 uppercase tracking-wider">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    CV Analizado con Éxito
                  </div>
                  <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight font-display">
                    Tu CV ha sido optimizado
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Revisa el diagnóstico e introduce tu nuevo CV con formato impecable de lectura directa.
                  </p>
                </div>

                <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full md:w-auto shrink-0">
                  <button
                    onClick={handleReset}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 py-3 px-5 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 active:scale-95 rounded-xl transition-all"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Analizar otro</span>
                  </button>
                  <button
                    onClick={handleDownloadPDF}
                    disabled={result.deliveryDecision && !result.deliveryDecision.allowDownload}
                    className={`flex-1 sm:flex-none flex items-center justify-center gap-2 py-3 px-6 text-sm font-bold rounded-xl shadow-sm transition-all ${
                      result.deliveryDecision && !result.deliveryDecision.allowDownload
                        ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                        : "text-white bg-blue-600 hover:bg-blue-700 active:scale-95 hover:shadow-md"
                    }`}
                  >
                    <Download className="w-4 h-4" />
                    <span>Descargar PDF</span>
                  </button>
                  <button
                    onClick={handleDownloadDOCX}
                    disabled={result.deliveryDecision && !result.deliveryDecision.allowDownload}
                    className={`flex-1 sm:flex-none flex items-center justify-center gap-2 py-3 px-5 text-sm font-bold rounded-xl shadow-sm transition-all border ${
                      result.deliveryDecision && !result.deliveryDecision.allowDownload
                        ? "bg-slate-200 text-slate-400 border-slate-200 cursor-not-allowed shadow-none"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 active:scale-95 hover:shadow-sm"
                    }`}
                  >
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span>Descargar Word</span>
                  </button>
                </div>
              </div>

              {/* Quality & Action Banner */}
              {result.deliveryDecision && (
                <div className={`p-5 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all ${
                  result.qualityStatus === "green" 
                    ? "bg-emerald-50/50 border-emerald-100 text-slate-800"
                    : result.qualityStatus === "yellow"
                    ? "bg-amber-50/50 border-amber-200 text-slate-800"
                    : "bg-rose-50/50 border-rose-200 text-slate-800"
                }`}>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {result.qualityStatus === "green" && (
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 font-bold text-sm">✓</span>
                      )}
                      {result.qualityStatus === "yellow" && (
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-amber-600 font-bold text-sm">!</span>
                      )}
                      {result.qualityStatus === "red" && (
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-100 text-rose-600 font-bold text-sm">✕</span>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-sm text-slate-900">
                          {result.qualityStatus === "green" && "Análisis de Calidad: Excelente"}
                          {result.qualityStatus === "yellow" && "Análisis de Calidad: Revisión Recomendada"}
                          {result.qualityStatus === "red" && "Análisis de Calidad: Calidad Insuficiente"}
                        </h4>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                          result.processingMode === "PRESERVE_AND_POLISH"
                            ? "bg-blue-100 text-blue-700"
                            : result.processingMode === "RESTRUCTURE_AND_IMPROVE"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-rose-100 text-rose-700"
                        }`}>
                          {result.processingMode === "PRESERVE_AND_POLISH" && "Conservar y Pulir"}
                          {result.processingMode === "RESTRUCTURE_AND_IMPROVE" && "Reestructurar y Mejorar"}
                          {result.processingMode === "REVIEW_REQUIRED" && "Revisión Crítica"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">
                        {result.deliveryDecision.userMessage}
                      </p>
                    </div>
                  </div>

                  {!result.deliveryDecision.allowDownload && (
                    <div className="text-xs font-bold text-rose-600 bg-rose-100/50 px-3 py-1.5 rounded-lg border border-rose-200 shrink-0">
                      Descarga Deshabilitada
                    </div>
                  )}
                </div>
              )}

              {/* Grid: Diagnóstico e Improved Preview */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Columna Izquierda: Diagnóstico */}
                <div className="lg:col-span-5 space-y-6">
                  {/* Panel de Puntuación */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm text-center">
                    <span className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
                      Puntuación de claridad ATS
                    </span>

                    <div className="relative inline-flex items-center justify-center mb-4">
                      {/* Radial Progress Gauge */}
                      <svg className="w-36 h-36 transform -rotate-90">
                        <circle
                          cx="72"
                          cy="72"
                          r="62"
                          stroke="#e2e8f0"
                          strokeWidth="10"
                          fill="transparent"
                        />
                        <motion.circle
                          cx="72"
                          cy="72"
                          r="62"
                          stroke={result.score >= 80 ? "#10b981" : result.score >= 50 ? "#f59e0b" : "#ef4444"}
                          strokeWidth="10"
                          fill="transparent"
                          strokeDasharray={2 * Math.PI * 62}
                          initial={{ strokeDashoffset: 2 * Math.PI * 62 }}
                          animate={{ strokeDashoffset: (2 * Math.PI * 62) * (1 - result.score / 100) }}
                          transition={{ duration: 1, ease: "easeOut" }}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute text-center">
                        <span className="text-4xl font-extrabold text-slate-900">{result.score}</span>
                        <span className="text-slate-400 text-xs block font-medium">de 100</span>
                      </div>
                    </div>

                    <div className="max-w-xs mx-auto">
                      <p className="text-sm font-semibold text-slate-800">
                        {result.score >= 80
                          ? "¡Excelente calidad!"
                          : result.score >= 60
                          ? "Buen camino, con mejoras pendientes"
                          : "Necesita mejoras estructurales urgentes"}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Tu CV original presentaba oportunidades de mejora que han sido resueltas en el documento optimizado.
                      </p>
                    </div>
                  </div>

                  {/* Panel de Diagnóstico */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                      <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <FileWarning className="w-4 h-4 text-blue-600" />
                        Diagnóstico Profesional de la IA
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Puntos clave analizados en tu currículum original para optimizar su impacto y legibilidad.
                      </p>
                    </div>

                    <div className="p-6 space-y-6">
                      {/* Errores de Extracción / Lectura */}
                      {result.extractionWarnings && result.extractionWarnings.length > 0 && (
                        <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4">
                          <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                            Detalles de Lectura del PDF ({result.extractionWarnings.length})
                          </h4>
                          <ul className="space-y-1.5">
                            {result.extractionWarnings.map((warn, idx) => (
                              <li key={idx} className="text-xs text-slate-700 flex items-start gap-2">
                                <span className="text-amber-600 font-bold mt-0.5">⚠</span>
                                <span>{warn}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Advertencias de Integridad de Datos */}
                      {result.dataIntegrityWarnings && result.dataIntegrityWarnings.length > 0 && (
                        <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-4">
                          <h4 className="text-xs font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                            Integridad de Datos ({result.dataIntegrityWarnings.length})
                          </h4>
                          <ul className="space-y-1.5">
                            {result.dataIntegrityWarnings.map((warn, idx) => (
                              <li key={idx} className="text-xs text-slate-700 flex items-start gap-2">
                                <span className="text-rose-500 font-bold mt-0.5">⚠</span>
                                <span>{warn}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Problemas Detectados */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-rose-500" />
                            Problemas Detectados
                          </h4>
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                            result.problems && result.problems.length > 0
                              ? "bg-rose-100 text-rose-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}>
                            {result.problems ? result.problems.length : 0} {result.problems && result.problems.length === 1 ? "problema" : "problemas"}
                          </span>
                        </div>
                        {result.problems && result.problems.length > 0 ? (
                          <div className="bg-rose-50/30 border border-rose-100/60 rounded-xl p-4">
                            <ul className="space-y-2.5">
                              {result.problems.map((prob, idx) => (
                                <li key={idx} className="text-xs text-slate-700 flex items-start gap-2.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 mt-1.5" />
                                  <span className="leading-relaxed">{prob}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : (
                          <div className="bg-emerald-50/30 border border-emerald-100/60 rounded-xl p-4 flex items-center gap-2.5">
                            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span className="text-xs text-slate-600">¡No se detectaron problemas de formato o claridad críticos!</span>
                          </div>
                        )}
                      </div>

                      {/* Secciones Faltantes */}
                      <div className="space-y-3 pt-4 border-t border-slate-100">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                            <PlusCircle className="w-4 h-4 text-amber-500" />
                            Secciones Faltantes
                          </h4>
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                            result.missingSections && result.missingSections.length > 0
                              ? "bg-amber-100 text-amber-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}>
                            {result.missingSections ? result.missingSections.length : 0} {result.missingSections && result.missingSections.length === 1 ? "omitida" : "omitidas"}
                          </span>
                        </div>
                        {result.missingSections && result.missingSections.length > 0 ? (
                          <div className="bg-amber-50/30 border border-amber-100/60 rounded-xl p-4">
                            <ul className="space-y-2.5">
                              {result.missingSections.map((sec, idx) => (
                                <li key={idx} className="text-xs text-slate-700 flex items-start gap-2.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                                  <span className="leading-relaxed font-medium text-slate-800">{sec}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : (
                          <div className="bg-emerald-50/30 border border-emerald-100/60 rounded-xl p-4 flex items-center gap-2.5">
                            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span className="text-xs text-slate-600">Tu currículum original cuenta con todas las secciones indispensables.</span>
                          </div>
                        )}
                      </div>

                      {/* Recomendaciones principales */}
                      <div className="space-y-3 pt-4 border-t border-slate-100">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-blue-500" />
                            Recomendaciones de IA
                          </h4>
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                            {result.recommendations ? result.recommendations.length : 0} sugeridas
                          </span>
                        </div>
                        {result.recommendations && result.recommendations.length > 0 ? (
                          <div className="bg-blue-50/20 border border-blue-100/50 rounded-xl p-4">
                            <ul className="space-y-2.5">
                              {result.recommendations.map((rec, idx) => (
                                <li key={idx} className="text-xs text-slate-700 flex items-start gap-2.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                                  <span className="leading-relaxed">{rec}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : (
                          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex items-center gap-2.5">
                            <CheckCircle className="w-4 h-4 text-slate-400 shrink-0" />
                            <span className="text-xs text-slate-500">No hay recomendaciones adicionales pendientes.</span>
                          </div>
                        )}
                      </div>

                      <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-400 leading-relaxed flex items-start gap-2.5 bg-slate-50/60 p-3.5 rounded-xl">
                        <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                        <span>
                          <strong>Nota de formato ATS:</strong> El currículum mejorado de la derecha ha corregido automáticamente la redacción, incorporando verbos activos, puliendo secciones y garantizando el cumplimiento estricto del estándar de lectura automática.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Columna Derecha: Vista Previa del CV Optimizado */}
                <div className="lg:col-span-7">
                  <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden relative group">
                    {/* Luces decorativas ambientales con desenfoque extremo detrás de la vista previa */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40 group-hover:opacity-60 transition-opacity duration-700">
                      <div className="absolute top-1/4 -left-1/4 w-96 h-96 rounded-full bg-blue-100/40 blur-3xl" />
                      <div className="absolute bottom-1/4 -right-1/4 w-96 h-96 rounded-full bg-purple-100/40 blur-3xl" />
                    </div>

                    {/* Header de la Hoja */}
                    <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between relative z-10">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-500" />
                        <span className="text-xs font-bold text-slate-600 font-display tracking-wider">
                          VISTA PREVIA DEL CV CORREGIDO
                        </span>
                      </div>
                      <span className="text-[10px] bg-slate-200 text-slate-600 px-2.5 py-0.5 rounded-full font-mono font-semibold">
                        Monocromo • Clean Executive • ATS V1
                      </span>
                    </div>

                    {/* Contenedor relativo de la hoja para admitir overlay de bloqueo y blur */}
                    <div className="relative">
                      {/* Hoja de CV Estilo Premium (Monocromático, Limpio) */}
                      <div className={`p-8 md:p-12 text-slate-950 bg-white font-serif max-h-[800px] overflow-y-auto leading-relaxed text-sm selection:bg-slate-200 selection:text-black transition-all duration-500 relative z-0 ${
                        result.deliveryDecision && !result.deliveryDecision.allowDownload
                          ? "blur-lg select-none pointer-events-none opacity-30"
                          : ""
                      }`}>
                        {/* Nombre */}
                        <h1 className="text-3xl font-extrabold tracking-tight font-display text-slate-950 uppercase mb-1">
                          {result.improvedCV.name}
                        </h1>

                        {/* Título profesional */}
                        {result.improvedCV.title && (
                          <p className="text-xs font-bold text-slate-700 tracking-widest font-sans uppercase mb-2">
                            {result.improvedCV.title}
                          </p>
                        )}

                        {/* Contacto */}
                        {result.improvedCV.contact && (
                          <p className="text-[11px] text-slate-600 font-sans border-b border-slate-200 pb-4 mb-5">
                            {result.improvedCV.contact}
                          </p>
                        )}

                        {/* Resumen */}
                        {result.improvedCV.summary && (
                          <div className="mb-6">
                            <h2 className="text-[11px] font-bold text-slate-900 tracking-wider font-sans uppercase mb-1.5">
                              Resumen Profesional
                            </h2>
                            <p className="text-xs text-slate-800 text-justify leading-relaxed font-serif">
                              {result.improvedCV.summary}
                            </p>
                          </div>
                        )}

                        {/* Experiencia Laboral */}
                        {result.improvedCV.experience && result.improvedCV.experience.length > 0 && (
                          <div className="mb-6">
                            <h2 className="text-[11px] font-bold text-slate-900 tracking-wider font-sans uppercase mb-3 border-t border-slate-100 pt-3">
                              Experiencia Laboral
                            </h2>
                            <div className="space-y-4">
                              {result.improvedCV.experience.map((exp, idx) => (
                                <div key={idx} className="space-y-1">
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs">
                                    <span className="font-bold font-sans text-slate-900">
                                      {exp.role} <span className="font-normal text-slate-500">— {exp.company}</span>
                                    </span>
                                    <span className="text-[11px] font-sans text-slate-500 italic">
                                      {exp.period}
                                    </span>
                                  </div>
                                  <div className="pl-4 space-y-1">
                                    {(exp.bullets || []).map((bullet, bIdx) => {
                                      let cleanB = bullet.trim();
                                      if (cleanB.startsWith("-") || cleanB.startsWith("•") || cleanB.startsWith("*")) {
                                        cleanB = cleanB.substring(1).trim();
                                      }
                                      return (
                                        <p key={bIdx} className="text-xs text-slate-800 list-item list-disc marker:text-slate-400 font-serif leading-relaxed">
                                          {cleanB}
                                        </p>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Educación */}
                        {result.improvedCV.education && result.improvedCV.education.length > 0 && (
                          <div className="mb-6">
                            <h2 className="text-[11px] font-bold text-slate-900 tracking-wider font-sans uppercase mb-3 border-t border-slate-100 pt-3">
                              Educación
                            </h2>
                            <div className="space-y-3">
                              {result.improvedCV.education.map((edu, idx) => (
                                <div key={idx} className="text-xs space-y-0.5">
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                                    <span className="font-bold font-sans text-slate-900">
                                      {edu.degree}
                                    </span>
                                    <span className="text-[11px] font-sans text-slate-500 italic">
                                      {edu.period}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-600 font-sans">
                                    {edu.institution}
                                  </p>
                                  {edu.description && (
                                    <p className="text-[11px] text-slate-700 italic mt-0.5 font-serif">
                                      {edu.description}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Habilidades */}
                        {result.improvedCV.skills && result.improvedCV.skills.length > 0 && (
                          <div className="mb-6">
                            <h2 className="text-[11px] font-bold text-slate-900 tracking-wider font-sans uppercase mb-2 border-t border-slate-100 pt-3">
                              Habilidades
                            </h2>
                            <p className="text-xs text-slate-800 font-serif">
                              {result.improvedCV.skills.join(" • ")}
                            </p>
                          </div>
                        )}

                        {/* Proyectos */}
                        {result.improvedCV.projects && result.improvedCV.projects.length > 0 && (
                          <div className="mb-6">
                            <h2 className="text-[11px] font-bold text-slate-900 tracking-wider font-sans uppercase mb-3 border-t border-slate-100 pt-3">
                              Proyectos Destacados
                            </h2>
                            <div className="space-y-3">
                              {result.improvedCV.projects.map((proj, idx) => (
                                <div key={idx} className="text-xs space-y-0.5">
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                                    <span className="font-bold font-sans text-slate-900">
                                      {proj.name}
                                    </span>
                                    {proj.period && (
                                      <span className="text-[11px] font-sans text-slate-500 italic">
                                        {proj.period}
                                      </span>
                                    )}
                                  </div>
                                  <div className="pl-4 space-y-1">
                                    {(proj.bullets || []).map((bullet, bIdx) => {
                                      let cleanB = bullet.trim();
                                      if (cleanB.startsWith("-") || cleanB.startsWith("•") || cleanB.startsWith("*")) {
                                        cleanB = cleanB.substring(1).trim();
                                      }
                                      return (
                                        <p key={bIdx} className="text-xs text-slate-800 list-item list-disc marker:text-slate-400 font-serif leading-relaxed">
                                          {cleanB}
                                        </p>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Certificaciones */}
                        {result.improvedCV.certifications && result.improvedCV.certifications.length > 0 && (
                          <div>
                            <h2 className="text-[11px] font-bold text-slate-900 tracking-wider font-sans uppercase mb-2 border-t border-slate-100 pt-3">
                              Certificaciones y Cursos
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-3">
                              {result.improvedCV.certifications.map((cert, idx) => (
                                <div key={idx} className="text-xs text-slate-800 list-item list-disc marker:text-slate-400 font-serif">
                                  {cert}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Desvanecimiento inferior de lectura premium (sólo si se permite la descarga) */}
                      {(!result.deliveryDecision || result.deliveryDecision.allowDownload) && (
                        <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-white via-white/85 to-transparent pointer-events-none flex items-end justify-center pb-6 z-10">
                          <div className="text-[10px] font-bold text-slate-500 tracking-wider bg-white/90 backdrop-blur-xs border border-slate-200 px-4 py-1.5 rounded-full shadow-lg flex items-center gap-2 uppercase font-sans">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            Vista Previa Parcial • Descarga el PDF completo
                          </div>
                        </div>
                      )}

                      {/* Bloqueo por calidad insuficiente (allowDownload === false) con un overlay hermoso y blur */}
                      {result.deliveryDecision && !result.deliveryDecision.allowDownload && (
                        <div className="absolute inset-0 bg-white/70 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center z-10 transition-all duration-500">
                          <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 mb-4 shadow-sm">
                            <Lock className="w-6 h-6" />
                          </div>
                          <h3 className="text-lg font-extrabold text-slate-900 font-display tracking-tight mb-2">
                            Descarga y Vista Previa Restringidas
                          </h3>
                          <p className="text-xs text-slate-600 max-w-sm mb-6 leading-relaxed">
                            {result.deliveryDecision.userMessage || "No pudimos extraer datos confiables de tu archivo. El formato de entrada podría estar corrupto o contener texto indescifrable."}
                          </p>
                          <div className="bg-rose-50/50 border border-rose-100 rounded-xl p-4 max-w-sm">
                            <p className="text-[11px] font-semibold text-rose-800 uppercase tracking-wider mb-1 font-sans">
                              Acción Recomendada
                            </p>
                            <p className="text-[11px] text-slate-600 leading-relaxed">
                              Por favor, usa la opción de <strong>Pegar texto del CV</strong> para ingresar tu currículum manualmente. Esto asegura un procesamiento de alta precisión.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-100 mt-20 py-8 px-4 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto space-y-2">
          <p className="font-semibold text-slate-600">
            Blank<span className="text-blue-600">ATS</span> — Herramienta gratuita de optimización de currículums.
          </p>
          <p>
            Diseño premium optimizado. Garantizamos que tus datos originales permanecen 100% verídicos sin inventar experiencia laboral.
          </p>
          <p className="pt-2 text-[10px]">
            &copy; {new Date().getFullYear()} BlankATS. Hecho para profesionales exigentes.
          </p>
        </div>
      </footer>
    </div>
  );
}
