"use client";

import Image from "next/image";
import type { ChangeEvent, DragEvent, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock3,
  CloudUpload,
  Download,
  FileDown,
  FileText,
  Home,
  Layers3,
  Lock,
  PenLine,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Trophy,
  Upload,
  UserRound,
} from "lucide-react";

type QualityStatus = "green" | "yellow" | "red";
type ProcessingMode =
  | "PRESERVE_AND_POLISH"
  | "RESTRUCTURE_AND_IMPROVE"
  | "REVIEW_REQUIRED";
type RecommendedAction =
  | "download_ready"
  | "review_before_download"
  | "request_better_input";

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
  qualityStatus: QualityStatus;
  processingMode: ProcessingMode;
  recommendedAction: RecommendedAction;
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

type Screen = "home" | "upload" | "analyzing" | "diagnosis" | "paywall" | "success";
type InputMode = "pdf" | "text";
type RawRecord = Record<string, unknown>;

const demoAnalysis: AnalysisResponse = {
  score: 78,
  qualityStatus: "yellow",
  processingMode: "RESTRUCTURE_AND_IMPROVE",
  recommendedAction: "review_before_download",
  extractionWarnings: ["Algunas secciones requieren revisión visual antes de descarga."],
  dataIntegrityWarnings: ["No se agregaron datos que no estuvieran presentes en el CV original."],
  problems: [
    "Faltan palabras clave relevantes",
    "Formato poco consistente",
    "Resumen profesional ausente",
    "Poca cuantificación de logros",
  ],
  missingSections: ["Resumen"],
  recommendations: [
    "Mejora el resumen",
    "Refuerza logros",
    "Optimiza palabras clave",
  ],
  improvedCV: {
    name: "Natalia Ruiz Castellanos",
    title: "Diseñadora UX/UI",
    contact: "CDMX, México · natalia@email.com · 55 1234 5678",
    summary:
      "Diseñadora UX/UI enfocada en crear experiencias digitales claras, intuitivas y centradas en resultados.",
    experience: [
      {
        company: "Empresa Digital",
        role: "Diseñadora UX/UI Senior",
        period: "2021 - Actualidad",
        bullets: [
          "Diseñó interfaces centradas en el usuario que mejoraron la conversión en 25%.",
          "Colaboró con equipos de producto y desarrollo para entregar soluciones claras y medibles.",
        ],
      },
    ],
    education: [
      {
        institution: "Universidad Nacional Autónoma de México",
        degree: "Licenciatura en Diseño Gráfico",
        period: "2016 - 2020",
      },
    ],
    skills: ["Research", "Diseño UI", "Figma", "Prototipado", "Sistemas visuales"],
    projects: [
      {
        name: "Rediseño de onboarding",
        period: "2024",
        bullets: ["Simplificó la lectura del perfil y mejoró el flujo de postulación."],
      },
    ],
  },
  deliveryDecision: {
    allowDownload: true,
    showWarningBeforeDownload: true,
    userMessage:
      "Revisa la vista previa antes de descargar para confirmar que refleja tu experiencia real.",
  },
};

const blue = "#0068ff";

function asRecord(value: unknown): RawRecord {
  return value && typeof value === "object" ? (value as RawRecord) : {};
}

function sanitizeImprovedCV(cv: unknown): ImprovedCV {
  const rawCV = asRecord(cv);

  const cleanText = (value: unknown): string => {
    let text = String(value ?? "").trim();
    text = text.replace(/\[[^\]]*\]/g, "");
    text = text.replace(/pendiente/gi, "");
    text = text.replace(/agregar aquí/gi, "");
    text = text.replace(/agregar aqui/gi, "");
    text = text.replace(/\bn\/a\b/gi, "");
    text = text.replace(/placeholder/gi, "");
    return text.replace(/\s+/g, " ").trim();
  };

  const sanitizeBullets = (bullets: unknown, descriptionFallback?: string): string[] => {
    let rawList: string[] = [];

    if (Array.isArray(bullets) && bullets.length > 0) {
      rawList = bullets.map((bullet) => String(bullet));
    } else if (descriptionFallback) {
      rawList = descriptionFallback.replace(/\.-/g, "\n").replace(/\s[-*]\s/g, "\n").split("\n");
    }

    return rawList
      .map((line) => cleanText(line).replace(/^[-*]\s?/, "").trim())
      .filter(Boolean);
  };

  const experience = Array.isArray(rawCV.experience)
    ? rawCV.experience.map((entry) => {
        const item = asRecord(entry);
        return {
          company: cleanText(item.company),
          role: cleanText(item.role),
          period: cleanText(item.period),
          bullets: sanitizeBullets(item.bullets, typeof item.description === "string" ? item.description : undefined),
        };
      })
    : [];

  const education = Array.isArray(rawCV.education)
    ? rawCV.education.map((entry) => {
        const item = asRecord(entry);
        return {
          institution: cleanText(item.institution),
          degree: cleanText(item.degree),
          period: cleanText(item.period),
          description: item.description ? cleanText(item.description) : undefined,
        };
      })
    : [];

  const projects = Array.isArray(rawCV.projects)
    ? rawCV.projects.map((entry) => {
        const item = asRecord(entry);
        return {
          name: cleanText(item.name),
          bullets: sanitizeBullets(item.bullets, typeof item.description === "string" ? item.description : undefined),
          period: item.period ? cleanText(item.period) : undefined,
        };
      })
    : [];

  return {
    name: cleanText(rawCV.name),
    title: cleanText(rawCV.title),
    contact: cleanText(rawCV.contact),
    summary: cleanText(rawCV.summary),
    experience,
    education,
    skills: Array.isArray(rawCV.skills) ? rawCV.skills.map(cleanText).filter(Boolean) : [],
    projects: projects.length ? projects : undefined,
    certifications: Array.isArray(rawCV.certifications) ? rawCV.certifications.map(cleanText).filter(Boolean) : undefined,
  };
}

export default function HomePage() {
  const [screen, setScreen] = useState<Screen>("home");
  const [inputMode, setInputMode] = useState<InputMode>("pdf");
  const [file, setFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [visualNote, setVisualNote] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [analyzingProgress, setAnalyzingProgress] = useState(0);
  const [analyzingMessage, setAnalyzingMessage] = useState("Leyendo el archivo…");
  const [analyzingStep, setAnalyzingStep] = useState(1);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const analyzingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const isDemoMode = typeof process !== "undefined" && process.env.NEXT_PUBLIC_DEMO_MODE === "true";
  const currentAnalysis = analysis ?? (isDemoMode ? demoAnalysis : null);
  const currentFileName = file?.name || "mi-cv.pdf";
  const canAnalyze = useMemo(() => Boolean(file || pastedText.trim()), [file, pastedText]);
  const hasRealAnalysis = Boolean(analysis);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  }, [screen]);

  useEffect(() => {
    return () => {
      if (analyzingIntervalRef.current) {
        clearInterval(analyzingIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!currentAnalysis && (screen === "diagnosis" || screen === "paywall" || screen === "success")) {
      setScreen("upload");
    }
  }, [screen, currentAnalysis]);

  const acceptFile = (selectedFile: File) => {
    if (selectedFile.type !== "application/pdf") {
      setVisualNote("Para esta versión usa PDF o pega texto en la pestaña correspondiente.");
      return;
    }
    setFile(selectedFile);
    setInputMode("pdf");
    setVisualNote(null);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) acceptFile(selectedFile);
  };

  const handleDrag = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(event.type === "dragenter" || event.type === "dragover");
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    const droppedFile = event.dataTransfer.files?.[0];
    if (droppedFile) acceptFile(droppedFile);
  };

  const fileToBase64 = (selectedFile: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result ?? "");
        const base64 = result.split(",")[1];
        if (base64) {
          resolve(base64);
        } else {
          reject(new Error("No se pudo leer el archivo."));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(selectedFile);
    });

  const runAnalysis = async () => {
    if (analyzingIntervalRef.current) {
      clearInterval(analyzingIntervalRef.current);
    }

    if (!canAnalyze) {
      if (isDemoMode) {
        setScreen("analyzing");
        setVisualNote(null);
        setAnalyzingProgress(10);
        setAnalyzingStep(1);
        setAnalyzingMessage("Leyendo el archivo…");
        setElapsedSeconds(0);

        const startTime = Date.now();
        let progress = 10;

        const intervalId = setInterval(() => {
          const elapsed = (Date.now() - startTime) / 1000;
          setElapsedSeconds(elapsed);

          if (progress < 94) {
            const inc = progress < 50 ? 2.5 : progress < 75 ? 1.5 : 0.8;
            progress = Math.min(94, progress + inc);
            setAnalyzingProgress(Math.floor(progress));
          } else {
            if (progress < 100) {
              progress = Math.min(100, progress + 15);
              setAnalyzingProgress(Math.floor(progress));
            } else {
              clearInterval(intervalId);
              setAnalysis(demoAnalysis);
              setTimeout(() => {
                setScreen("diagnosis");
              }, 600);
            }
          }

          let step = 1;
          let msg = "Leyendo el archivo…";
          if (progress >= 100) {
            step = 4;
            msg = "Diagnóstico listo";
          } else {
            if (progress < 25) {
              step = 1;
              msg = "Leyendo el archivo…";
            } else if (progress < 50) {
              step = 2;
              msg = "Detectando secciones del CV…";
            } else if (progress < 75) {
              step = 3;
              msg = "Evaluando claridad y estructura…";
            } else {
              step = 4;
              msg = "Construyendo versión mejorada…";
            }
          }

          if (progress < 100) {
            if (progress >= 10 && progress < 20) msg = "Leyendo el archivo…";
            else if (progress >= 20 && progress < 35) msg = "Detectando secciones del CV…";
            else if (progress >= 35 && progress < 55) msg = "Evaluando claridad y estructura…";
            else if (progress >= 55 && progress < 75) msg = "Preparando recomendaciones…";
            else if (progress >= 75) msg = "Construyendo versión mejorada…";
          }

          setAnalyzingStep(step);
          setAnalyzingMessage(msg);
        }, 150);
        analyzingIntervalRef.current = intervalId;
      } else {
        setVisualNote("Por favor, sube un archivo PDF o pega el texto de tu CV para iniciar el análisis.");
        setScreen("upload");
      }
      return;
    }

    setScreen("analyzing");
    setVisualNote(null);
    setAnalyzingProgress(10);
    setAnalyzingStep(1);
    setAnalyzingMessage("Leyendo el archivo…");
    setElapsedSeconds(0);

    const startTime = Date.now();
    let progress = 10;
    let apiCompleted = false;
    let apiResult: AnalysisResponse | null = null;
    let apiError: any = null;

    const apiPromise = (async () => {
      try {
        const pdfBase64 = file ? await fileToBase64(file) : undefined;
        const response = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pdfBase64,
            originalText: pastedText.trim() || undefined,
          }),
        });

        if (!response.ok) {
          let errDetail = "";
          try {
            const errData = await response.json();
            errDetail = errData.error || "";
          } catch {}
          throw new Error(errDetail || "El análisis real falló.");
        }

        const data = (await response.json()) as AnalysisResponse;
        data.improvedCV = sanitizeImprovedCV(data.improvedCV);
        return data;
      } catch (err: any) {
        if (isDemoMode) {
          console.warn("API failed in demo mode, falling back to demoAnalysis", err);
          return demoAnalysis;
        }
        throw err;
      }
    })();

    apiPromise
      .then((data) => {
        apiResult = data;
        apiCompleted = true;
      })
      .catch((err) => {
        apiError = err;
        apiCompleted = true;
      });

    const intervalId = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      setElapsedSeconds(elapsed);

      if (!apiCompleted) {
        if (progress < 94) {
          const inc = progress < 50 ? 1.5 : progress < 75 ? 0.8 : 0.3;
          progress = Math.min(94, progress + inc);
          setAnalyzingProgress(Math.floor(progress));
        }
      } else {
        if (apiError) {
          clearInterval(intervalId);
          setAnalysis(null);
          setVisualNote(apiError?.message || "Ocurrió un error al analizar tu CV. Por favor, asegúrate de que el archivo sea válido o inténtalo de nuevo.");
          setScreen("upload");
          return;
        }

        if (elapsed >= 4.5) {
          if (progress < 100) {
            progress = Math.min(100, progress + 15);
            setAnalyzingProgress(Math.floor(progress));
          } else {
            clearInterval(intervalId);
            if (apiResult) {
              setAnalysis(apiResult);
              setTimeout(() => {
                setScreen("diagnosis");
              }, 600);
            }
          }
        } else {
          if (progress < 94) {
            const inc = progress < 50 ? 1.5 : progress < 75 ? 0.8 : 0.3;
            progress = Math.min(94, progress + inc);
            setAnalyzingProgress(Math.floor(progress));
          }
        }
      }

      let step = 1;
      let msg = "Leyendo el archivo…";
      if (progress >= 100) {
        step = 4;
        msg = "Diagnóstico listo";
      } else {
        if (progress < 25) {
          step = 1;
          msg = "Leyendo el archivo…";
        } else if (progress < 50) {
          step = 2;
          msg = "Detectando secciones del CV…";
        } else if (progress < 75) {
          step = 3;
          msg = "Evaluando claridad y estructura…";
        } else {
          step = 4;
          msg = "Construyendo versión mejorada…";
        }
      }

      if (progress < 100) {
        if (progress >= 10 && progress < 20) msg = "Leyendo el archivo…";
        else if (progress >= 20 && progress < 35) msg = "Detectando secciones del CV…";
        else if (progress >= 35 && progress < 55) msg = "Evaluando claridad y estructura…";
        else if (progress >= 55 && progress < 75) msg = "Preparando recomendaciones…";
        else if (progress >= 75) msg = "Construyendo versión mejorada…";
      }

      if (elapsed > 20 && progress < 100) {
        msg = "Esto puede tardar un poco más si el CV tiene mucho contenido.";
      }

      setAnalyzingStep(step);
      setAnalyzingMessage(msg);
    }, 150);

    analyzingIntervalRef.current = intervalId;
  };

  const downloadPDF = async () => {
    if (!currentAnalysis) {
      setVisualNote("No hay un análisis real disponible para descargar.");
      setScreen("upload");
      return;
    }

    if (currentAnalysis.deliveryDecision && !currentAnalysis.deliveryDecision.allowDownload) {
      setVisualNote(currentAnalysis.deliveryDecision.userMessage);
      setScreen("diagnosis");
      return;
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

      const cv = currentAnalysis.improvedCV;

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

      doc.save(`CV_Optimizado_${cv.name.replace(/\s+/g, "_")}.pdf`);
    } catch (e) {
      console.error("Error al descargar PDF:", e);
      alert("Hubo un error al generar tu PDF. Por favor intenta de nuevo.");
    }
  };

  const downloadDoc = async () => {
    if (!currentAnalysis) {
      setVisualNote("No hay un análisis real disponible para descargar.");
      setScreen("upload");
      return;
    }

    if (currentAnalysis.deliveryDecision && !currentAnalysis.deliveryDecision.allowDownload) {
      setVisualNote(currentAnalysis.deliveryDecision.userMessage);
      setScreen("diagnosis");
      return;
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

      const cv = currentAnalysis.improvedCV;
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

  const goHome = () => {
    setScreen("home");
    setAnalysis(null);
    setVisualNote(null);
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-white text-[#070b2f]">
      <div className="mx-auto min-h-screen w-full max-w-[390px] overflow-x-hidden bg-white">
        {screen === "home" ? <LandingScreen onGo={setScreen} hasRealAnalysis={hasRealAnalysis} /> : null}
        {screen === "upload" ? (
          <UploadScreen
            canAnalyze={canAnalyze}
            dragActive={dragActive}
            file={file}
            fileInputRef={fileInputRef}
            inputMode={inputMode}
            note={visualNote}
            pastedText={pastedText}
            onAnalyze={runAnalysis}
            onBack={() => setScreen("home")}
            onDrag={handleDrag}
            onDrop={handleDrop}
            onFileChange={handleFileChange}
            onMode={setInputMode}
            onText={setPastedText}
          />
        ) : null}
        {screen === "analyzing" ? (
          <AnalyzingScreen
            fileName={currentFileName}
            progress={analyzingProgress}
            activeStep={analyzingStep}
            loadingMessage={analyzingMessage}
            file={file}
          />
        ) : null}
        {screen === "diagnosis" && currentAnalysis ? (
          <DiagnosisScreen
            analysis={currentAnalysis}
            note={visualNote}
            onBack={() => setScreen("upload")}
            onUnlock={() => setScreen("paywall")}
          />
        ) : null}
        {screen === "paywall" ? (
          <PaywallScreen onBack={() => setScreen("diagnosis")} onUnlock={() => setScreen("success")} />
        ) : null}
        {screen === "success" && currentAnalysis ? (
          <SuccessScreen
            analysis={currentAnalysis}
            fileName={currentFileName}
            onDoc={downloadDoc}
            onHome={goHome}
            onPdf={downloadPDF}
          />
        ) : null}
      </div>
    </main>
  );
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function compactFileName(name: string, maxLength = 28) {
  if (name.length <= maxLength) return name;

  const lastDot = name.lastIndexOf(".");
  const hasExtension = lastDot > 0 && lastDot < name.length - 1;
  const extension = hasExtension ? name.slice(lastDot) : "";
  const baseName = hasExtension ? name.slice(0, lastDot) : name;

  const startLength = 18;
  const endLength = Math.max(6, maxLength - startLength - extension.length - 3);

  return `${baseName.slice(0, startLength)}...${baseName.slice(-endLength)}${extension}`;
}

function LandingScreen({ onGo, hasRealAnalysis }: { onGo: (screen: Screen) => void; hasRealAnalysis: boolean }) {
  return (
    <ScreenShell>
      <SimpleHeader />

      <section className="px-5 pt-5 text-center">
        <h1 className="text-[27px] font-black leading-[1.1] tracking-[-0.03em] min-[390px]:text-[29px]">
          Mejora tu CV
          <span className="block text-[#0068ff]">antes de enviarlo</span>
        </h1>
        <p className="mx-auto mt-2 max-w-[320px] text-[14px] font-medium leading-5 text-[#626a79]">
          Recibe un diagnóstico gratuito y desbloquea una versión profesional más clara, ordenada y lista para descargar.
        </p>
        <button className="mt-4 flex h-[48px] w-full items-center justify-center gap-2.5 rounded-[9px] bg-[#0068ff] text-[15px] font-black text-white shadow-[0_10px_20px_rgba(0,104,255,0.18)] transition duration-200 hover:-translate-y-0.5 active:scale-[0.98]" onClick={() => onGo("upload")}>
          <Sparkles className="h-4.5 w-4.5" />
          Analizar mi CV gratis
        </button>
      </section>

      <section className="px-5 pt-4">
        <HomeScoreCard />
      </section>

      <section className="px-5 pt-4">
        <h2 className="text-left text-[18px] font-black">Cómo funciona</h2>
        <div className="mt-2 grid grid-cols-1 gap-2">
          <HowStep icon={<Upload className="h-7 w-7" />} number="1" title="Sube tu CV">
            Carga tu PDF y nuestra IA lo analiza al instante.
          </HowStep>
          <HowStep icon={<BarChart3 className="h-7 w-7" />} number="2" title="Recibe diagnóstico">
            Obtén tu puntaje y una lista de mejoras clave.
          </HowStep>
          <HowStep icon={<FileText className="h-7 w-7" />} number="3" title="Desbloquea versión mejorada">
            Descarga tu CV optimizado listo para enviar.
          </HowStep>
        </div>
      </section>

      <section className="px-5 pt-4">
        <OfferCard onClick={() => onGo(hasRealAnalysis ? "paywall" : "upload")} />
      </section>

      <ProtectedNote className="mt-3 pb-4" />
    </ScreenShell>
  );
}

function UploadScreen({
  canAnalyze,
  dragActive,
  file,
  fileInputRef,
  inputMode,
  note,
  pastedText,
  onAnalyze,
  onBack,
  onDrag,
  onDrop,
  onFileChange,
  onMode,
  onText,
}: {
  canAnalyze: boolean;
  dragActive: boolean;
  file: File | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  inputMode: InputMode;
  note: string | null;
  pastedText: string;
  onAnalyze: () => void;
  onBack: () => void;
  onDrag: (event: DragEvent<HTMLDivElement>) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onMode: (mode: InputMode) => void;
  onText: (text: string) => void;
}) {
  return (
    <ScreenShell>
      <BackHeader onBack={onBack} />
      <section className="px-5 pt-4 text-center">
        <Badge icon={<CloudUpload className="h-4 w-4" />}>Carga de CV</Badge>
        <h1 className="mt-3 text-[28px] font-black leading-none tracking-[-0.035em] min-[390px]:text-[31px]">
          Sube tu <span className="text-[#0068ff]">CV</span>
        </h1>
        <p className="mx-auto mt-2 max-w-[320px] text-[14px] font-medium leading-6 text-[#626a79]">
          Carga tu archivo PDF o pega el texto de tu currículum para recibir un diagnóstico gratuito.
        </p>
      </section>

      <section className="px-5 pt-4">
        <div className="grid h-[46px] grid-cols-2 rounded-[11px] border border-[#dbe2ec] bg-white p-1 shadow-[0_8px_20px_rgba(15,25,55,0.04)]">
          <TabButton active={inputMode === "pdf"} icon={<FileText className="h-5 w-5" />} onClick={() => onMode("pdf")}>
            Archivo PDF
          </TabButton>
          <TabButton active={inputMode === "text"} icon={<PenLine className="h-5 w-5" />} onClick={() => onMode("text")}>
            Pegar texto
          </TabButton>
        </div>

        <div className="mt-3 rounded-[14px] border border-[#e8edf4] bg-white p-3.5 shadow-[0_8px_20px_rgba(15,25,55,0.05)]">
          {inputMode === "pdf" ? (
            <div
              className={`relative grid min-h-[150px] place-items-center rounded-[10px] border-2 border-dashed p-3 text-center ${
                dragActive ? "border-[#0068ff] bg-[#f4f8ff]" : "border-[#8aa5c7] bg-white"
              }`}
              onDragEnter={onDrag}
              onDragLeave={onDrag}
              onDragOver={onDrag}
              onDrop={onDrop}
            >
              <input ref={fileInputRef} type="file" accept="application/pdf" className="sr-only" onChange={onFileChange} />
              <button className="absolute inset-0 cursor-pointer" aria-label="Seleccionar PDF" onClick={() => fileInputRef.current?.click()} type="button" />
              <div className="w-full max-w-full min-w-0 overflow-hidden flex flex-col items-center">
                <div className="mx-auto grid h-[52px] w-[52px] place-items-center rounded-full bg-[#edf5ff] text-[#0068ff]">
                  <FileText className="h-6 w-6" />
                </div>
                <h2
                  className="mx-auto mt-3.5 block w-full max-w-[240px] min-[390px]:max-w-[80%] overflow-hidden text-ellipsis whitespace-nowrap px-1 text-[16px] font-black tracking-[-0.02em] break-normal text-center"
                  title={file ? file.name : undefined}
                >
                  {file ? compactFileName(file.name) : <>Arrastra o <span className="text-[#0068ff]">selecciona</span> tu CV</>}
                </h2>
                <p className="mt-1 text-[13px] font-medium text-[#8a929f]">Solo PDF · Máx. 10 MB</p>
              </div>
            </div>
          ) : (
            <textarea
              value={pastedText}
              onChange={(event) => onText(event.target.value)}
              className="min-h-[150px] w-full resize-none rounded-[10px] border-2 border-dashed border-[#8aa5c7] bg-white p-3 text-[14px] leading-5 text-[#070b2f] outline-none placeholder:text-[#8a929f]"
              placeholder="Pega aquí el texto de tu currículum para recibir el diagnóstico visual."
            />
          )}
        </div>

        <div className="mt-3 flex items-center gap-2.5 rounded-[12px] border border-[#e7edf5] bg-white p-3 shadow-[0_6px_16px_rgba(15,25,55,0.04)]">
          <div className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-full bg-[#edf5ff] text-[#0068ff]">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <p className="text-[13.5px] font-medium leading-5 text-[#626a79]">
            <span className="font-black text-[#070b2f]">Tus datos están protegidos.</span> No compartimos tu información y tu archivo se usa solo para el análisis.
          </p>
        </div>

        {note ? <p className="mt-3 rounded-[10px] bg-[#fff7e9] px-3.5 py-2.5 text-[13px] font-bold leading-5 text-[#935a12]">{note}</p> : null}

        <button className="mt-4 flex h-[48px] w-full items-center justify-center gap-2.5 rounded-[9px] bg-[#0068ff] text-[15px] font-black text-white shadow-[0_10px_20px_rgba(0,104,255,0.18)] transition duration-200 hover:-translate-y-0.5 active:scale-[0.98] disabled:bg-[#9fc7ff]" disabled={!canAnalyze} onClick={onAnalyze}>
          <Sparkles className="h-5 w-5" />
          Analizar mi CV
        </button>
      </section>
    </ScreenShell>
  );
}

function AnalyzingScreen({
  fileName,
  progress,
  activeStep,
  loadingMessage,
  file,
}: {
  fileName: string;
  progress: number;
  activeStep: number;
  loadingMessage: string;
  file: File | null;
}) {
  const getFileInfo = () => {
    if (!file) {
      return "Texto copiado · CV";
    }
    const sizeKb = (file.size / 1024).toFixed(1);
    return `${sizeKb} KB · PDF`;
  };

  return (
    <ScreenShell>
      <SimpleHeader />
      <section className="px-5 pt-4 text-center">
        <Badge icon={<Sparkles className="h-4 w-4" />}>Procesando tu CV</Badge>
        <h1 className="mt-3 text-[28px] font-black leading-none tracking-[-0.035em] min-[390px]:text-[31px]">Analizando tu CV</h1>
        <p className="mt-2 min-h-[40px] px-3 text-[14px] font-medium text-[#626a79]">{loadingMessage}</p>
        <div className="mt-3.5">
          <ProgressRing value={progress} mode="percent" size={140} />
        </div>
      </section>

      <section className="px-5 pt-4">
        <div className="flex items-center gap-2.5 rounded-[12px] border border-[#e4e9f0] bg-white p-3 shadow-[0_6px_16px_rgba(15,25,55,0.04)]">
          <PdfIcon />
          <div className="min-w-0 flex-1 text-left overflow-hidden">
            <p
              className="block w-full max-w-[210px] min-[390px]:max-w-[240px] overflow-hidden text-ellipsis whitespace-nowrap text-[16px] font-black break-normal"
              title={fileName}
            >
              {compactFileName(fileName)}
            </p>
            <p className="mt-1 text-[13px] font-medium text-[#626a79]">{getFileInfo()}</p>
          </div>
          <CheckCircle2 className="h-6 w-6 shrink-0 text-[#18b965]" />
        </div>

        <div className="mt-3.5 rounded-[12px] border border-[#e4e9f0] bg-white p-3.5 shadow-[0_6px_16px_rgba(15,25,55,0.04)]">
          <TimelineStep done={activeStep > 1} active={activeStep === 1} number="1" title="Extrayendo texto">Obteniendo y estructurando el texto de tu documento.</TimelineStep>
          <TimelineStep done={activeStep > 2} active={activeStep === 2} number="2" title="Analizando contenido">Evaluando claridad, relevancia y estructura.</TimelineStep>
          <TimelineStep done={activeStep > 3} active={activeStep === 3} number="3" title="Optimizando formato">Mejorando presentación, secciones y legibilidad.</TimelineStep>
          <TimelineStep done={activeStep > 4} active={activeStep === 4} number="4" title="Generando versión mejorada">Redactando sugerencias y preparando tu CV optimizado.</TimelineStep>
        </div>

        <div className="mt-3 flex items-center justify-center gap-1.5 border-b border-[#edf0f5] pb-3 text-[14px] font-medium text-[#626a79]">
          <Clock3 className="h-5 w-5 text-[#0068ff]" />
          Esto tarda menos de 1 minuto
        </div>
      </section>

      <section className="px-5 pt-3.5 pb-4">
        <h2 className="text-[18px] font-black">¿Qué estamos evaluando?</h2>
        <div className="mt-2 grid grid-cols-1 gap-2">
          <EvalCard icon={<FileText className="h-6 w-6" />} title="Formato">Estructura, orden y legibilidad del CV.</EvalCard>
          <EvalCard icon={<UserRound className="h-6 w-6" />} title="Contenido">Relevancia, claridad y palabras clave.</EvalCard>
          <EvalCard icon={<Star className="h-6 w-6" />} title="Impacto">Alineación con el puesto y resultados.</EvalCard>
        </div>
      </section>
    </ScreenShell>
  );
}

function getRecoIcon(index: number, text: string) {
  const lowercase = text.toLowerCase();
  if (lowercase.includes("resumen") || lowercase.includes("perfil")) {
    return <UserRound className="h-7 w-7" />;
  }
  if (lowercase.includes("logro") || lowercase.includes("métrica") || lowercase.includes("cuantific")) {
    return <BarChart3 className="h-7 w-7" />;
  }
  if (lowercase.includes("palabra") || lowercase.includes("keyword") || lowercase.includes("clave") || lowercase.includes("habili") || lowercase.includes("tecnol")) {
    return <Search className="h-7 w-7" />;
  }
  if (lowercase.includes("formato") || lowercase.includes("diseño") || lowercase.includes("estructur") || lowercase.includes("lectur")) {
    return <Layers3 className="h-7 w-7" />;
  }
  
  if (index === 0) return <UserRound className="h-7 w-7" />;
  if (index === 1) return <BarChart3 className="h-7 w-7" />;
  return <Search className="h-7 w-7" />;
}

function parseRecommendation(reco: string, index: number) {
  const parts = reco.split(":");
  if (parts.length > 1) {
    return {
      title: parts[0].trim(),
      desc: parts.slice(1).join(":").trim()
    };
  }
  const text = reco.trim();
  const lowercase = text.toLowerCase();
  let title = "Recomendación";
  if (lowercase.includes("resumen") || lowercase.includes("perfil")) {
    title = "Mejora el resumen";
  } else if (lowercase.includes("logro") || lowercase.includes("métrica") || lowercase.includes("cuantific")) {
    title = "Refuerza logros";
  } else if (lowercase.includes("palabra") || lowercase.includes("keyword") || lowercase.includes("clave") || lowercase.includes("habili")) {
    title = "Optimiza palabras clave";
  } else if (lowercase.includes("formato") || lowercase.includes("diseño") || lowercase.includes("estructur") || lowercase.includes("lectur")) {
    title = "Estructura y formato";
  } else {
    if (index === 0) title = "Optimización de perfil";
    else if (index === 1) title = "Claridad y enfoque";
    else title = "Relevancia profesional";
  }
  return { title, desc: text };
}

function DiagnosisScreen({
  analysis,
  note,
  onBack,
  onUnlock,
}: {
  analysis: AnalysisResponse;
  note: string | null;
  onBack: () => void;
  onUnlock: () => void;
}) {
  const score = analysis.score || 0;
  let scoreTitle = "Tu CV requiere una mejora profunda";
  if (score >= 90) {
    scoreTitle = "Tu CV tiene una base muy sólida";
  } else if (score >= 75) {
    scoreTitle = "Buen potencial, con mejoras importantes";
  } else if (score >= 60) {
    scoreTitle = "Tu CV necesita ajustes clave";
  }

  const getSubtitleText = (status: string, msg: string) => {
    let statusDesc = "Tu CV tiene una base sólida.";
    if (status === "green") {
      statusDesc = "¡Excelente! Tu CV cuenta con una calidad sobresaliente.";
    } else if (status === "red") {
      statusDesc = "Atención: detectamos múltiples problemas críticos de lectura y formato.";
    } else if (status === "yellow") {
      statusDesc = "Buen potencial. Con algunos ajustes clave, puedes aumentar considerablemente su impacto.";
    }
    return `${statusDesc} ${msg || ""}`.trim();
  };

  const hasExp = Boolean(analysis.improvedCV?.experience && analysis.improvedCV.experience.length > 0);
  const hasEdu = Boolean(analysis.improvedCV?.education && analysis.improvedCV.education.length > 0);
  const hasSkills = Boolean(analysis.improvedCV?.skills && analysis.improvedCV.skills.length > 0);
  const hasProj = Boolean(analysis.improvedCV?.projects && analysis.improvedCV.projects.length > 0);
  const hasCert = Boolean(analysis.improvedCV?.certifications && analysis.improvedCV.certifications.length > 0);

  const allowDownload = analysis.deliveryDecision?.allowDownload !== false;
  const userMessage = analysis.deliveryDecision?.userMessage || "Tu CV ha sido analizado con éxito.";

  return (
    <ScreenShell>
      <BackHeader onBack={onBack} />
      <section className="px-5 pt-3.5 text-center">
        <Badge icon={<Sparkles className="h-4 w-4" />}>Diagnóstico gratuito</Badge>
        <h1 className="mt-3 text-[28px] font-black leading-none tracking-[-0.035em] min-[390px]:text-[31px]">Tu diagnóstico</h1>
        <p className="mt-2 text-[14px] font-medium text-[#626a79]">Detectamos oportunidades de mejora en tu CV.</p>
      </section>

      <section className="px-5 pt-3 pb-4">
        <div className="grid grid-cols-1 items-center gap-3 rounded-[12px] border border-[#e4e9f0] bg-white p-3 text-center shadow-[0_6px_16px_rgba(15,25,55,0.04)]">
          <ProgressRing value={score} mode="score" size={96} />
          <div className="border-t border-[#e8edf4] pt-3 text-left">
            <h2 className="text-[17px] font-black leading-tight">{scoreTitle}</h2>
            <p className="mt-2 text-[13.5px] font-medium leading-5 text-[#626a79]">
              {getSubtitleText(analysis.qualityStatus, userMessage)}
            </p>
          </div>
        </div>

        {note ? <p className="mt-3 rounded-[10px] bg-[#fff7e9] px-3.5 py-2.5 text-[13px] font-bold leading-5 text-[#935a12]">{note}</p> : null}

        <SectionTitle number="1" title="Problemas detectados" />
        {(!analysis.problems || analysis.problems.length === 0) ? (
          <div className="rounded-[12px] border border-[#e4e9f0] bg-white p-3.5 text-center shadow-[0_5px_12px_rgba(15,25,55,0.04)]">
            <p className="text-[13.5px] font-medium text-[#129853]">No detectamos problemas críticos, solo oportunidades de mejora.</p>
          </div>
        ) : (
          <div className="rounded-[11px] border border-[#e4e9f0] bg-white shadow-[0_5px_12px_rgba(15,25,55,0.04)]">
            {problemRows(analysis).map((item) => <ProblemLine key={item.label} {...item} />)}
          </div>
        )}

        <SectionTitle number="2" title="Secciones detectadas" />
        <div className="flex flex-wrap gap-2">
          {hasExp && <Chip ok>Experiencia</Chip>}
          {hasEdu && <Chip ok>Educación</Chip>}
          {hasSkills && <Chip ok>Habilidades</Chip>}
          {hasProj && <Chip ok>Proyectos</Chip>}
          {hasCert && <Chip ok>Certificaciones</Chip>}
          {analysis.missingSections && analysis.missingSections.map((section) => (
            <Chip key={section} warn>Falta: {section}</Chip>
          ))}
          {!hasExp && !hasEdu && !hasSkills && !hasProj && !hasCert && (!analysis.missingSections || analysis.missingSections.length === 0) && (
            <span className="text-[14px] text-[#626a79] font-medium">Ninguna sección detectada de forma clara.</span>
          )}
        </div>

        <SectionTitle number="3" title="Recomendaciones clave" />
        {(!analysis.recommendations || analysis.recommendations.length === 0) ? (
          <div className="rounded-[12px] border border-[#e4e9f0] bg-white p-3.5 text-center shadow-[0_5px_12px_rgba(15,25,55,0.04)]">
            <p className="text-[13.5px] font-medium text-[#626a79]">
              Tu CV ya tiene una presentación clara. Revisa la versión mejorada antes de descargar.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {analysis.recommendations.map((reco, index) => {
              const { title, desc } = parseRecommendation(reco, index);
              const icon = getRecoIcon(index, reco);
              return (
                <RecoCard key={index} icon={icon} title={title}>
                  {desc}
                </RecoCard>
              );
            })}
          </div>
        )}

        {analysis.extractionWarnings && analysis.extractionWarnings.length > 0 && (
          <div className="mt-3.5 rounded-[10px] border border-[#ffe2bd] bg-[#fffaf4] p-3 text-left">
            <h3 className="flex items-center gap-2 text-[14px] font-black text-[#a86315]">
              <AlertTriangle className="h-4 w-4 shrink-0 text-[#d48624]" />
              Advertencias de lectura
            </h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-[13px] font-medium leading-5 text-[#73400a]">
              {analysis.extractionWarnings.map((warn, i) => (
                <li key={i}>{warn}</li>
              ))}
            </ul>
          </div>
        )}

        {analysis.dataIntegrityWarnings && analysis.dataIntegrityWarnings.length > 0 && (
          <div className="mt-3 rounded-[10px] border border-[#e4e9f0] bg-[#f8fafc] p-3 text-left">
            <h3 className="flex items-center gap-2 text-[14px] font-black text-[#475569]">
              <ShieldCheck className="h-4 w-4 shrink-0 text-[#64748b]" />
              Datos que debes revisar
            </h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-[13px] font-medium leading-5 text-[#475569]">
              {analysis.dataIntegrityWarnings.map((warn, i) => (
                <li key={i}>{warn}</li>
              ))}
            </ul>
          </div>
        )}

        <SectionTitle number="4" title="Versión mejorada" />
        <LockedPreview cv={analysis.improvedCV} />

        <button
          disabled={!allowDownload}
          className="mt-4 flex h-[48px] w-full items-center justify-center gap-2.5 rounded-[9px] bg-[#0068ff] text-[15px] font-black text-white shadow-[0_10px_20px_rgba(0,104,255,0.18)] transition duration-200 hover:-translate-y-0.5 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-[#9fc7ff] disabled:shadow-none"
          onClick={onUnlock}
        >
          <Lock className="h-5 w-5" />
          Desbloquear mi CV mejorado
        </button>
        {!allowDownload ? (
          <p className="mt-2.5 rounded-[10px] bg-[#fff7e9] px-3 py-2 text-[13px] font-bold leading-5 text-[#935a12] text-center">
            {userMessage}
          </p>
        ) : null}

        <div className="mt-3 grid grid-cols-1 divide-y divide-[#e2e8f0] rounded-[10px] border border-[#e7edf5] bg-white text-center text-[12px] font-medium text-[#626a79]">
          <TrustItem icon={<FileDown className="h-5 w-5" />}>Pago único</TrustItem>
          <TrustItem icon={<FileText className="h-5 w-5" />}>Descarga en PDF</TrustItem>
          <TrustItem icon={<ShieldCheck className="h-5 w-5" />}>Pago seguro</TrustItem>
        </div>
      </section>
    </ScreenShell>
  );
}

function PaywallScreen({ onBack, onUnlock }: { onBack: () => void; onUnlock: () => void }) {
  return (
    <ScreenShell>
      <BackHeader onBack={onBack} />
      <section className="px-5 pt-3.5 text-center">
        <h1 className="text-[28px] font-black leading-[1.1] tracking-[-0.035em] min-[390px]:text-[31px]">
          Desbloquea tu
          <span className="block text-[#0068ff]">CV mejorado</span>
        </h1>
        <p className="mt-2.5 text-[14px] font-medium text-[#626a79]">Conoce lo que ya optimizamos en tu documento.</p>
      </section>

      <section className="px-5 pt-3 pb-4">
        <div className="grid grid-cols-1 gap-2.5 rounded-[12px] border border-[#e4e9f0] bg-white p-3 shadow-[0_6px_16px_rgba(15,25,55,0.04)]">
          <MiniCvLocked />
          <div className="text-left">
            <h2 className="text-[16px] font-black">Vista final protegida</h2>
            <p className="mt-1.5 text-[13.5px] font-medium leading-5 text-[#626a79]">Tu nueva versión está lista para ayudarte a destacar.</p>
          </div>
        </div>

        <div className="mt-3 rounded-[12px] border border-[#e4e9f0] bg-white p-3 shadow-[0_6px_16px_rgba(15,25,55,0.04)]">
          <h2 className="text-center text-[18px] font-black">Tu nueva versión incluye</h2>
          <FeatureLine icon={<PenLine className="h-5 w-5" />}>Resumen profesional reescrito</FeatureLine>
          <FeatureLine icon={<Trophy className="h-5 w-5" />}>Logros más claros</FeatureLine>
          <FeatureLine icon={<FileText className="h-5 w-5" />}>Formato limpio</FeatureLine>
          <FeatureLine icon={<Layers3 className="h-5 w-5" />}>Secciones reorganizadas</FeatureLine>
          <FeatureLine icon={<Search className="h-5 w-5" />}>Palabras clave reforzadas</FeatureLine>
          <FeatureLine icon={<Download className="h-5 w-5" />}>PDF listo para descargar</FeatureLine>
        </div>

        <div className="mt-3 rounded-[12px] border border-[#e4e9f0] bg-white p-3 text-center shadow-[0_6px_16px_rgba(15,25,55,0.04)]">
          <div className="flex flex-wrap items-end justify-center gap-x-4 gap-y-1">
            <span className="pb-2 text-[17px] font-bold text-[#6f7682] line-through">$99 MXN</span>
            <span className="text-[42px] font-black leading-none text-[#0068ff]">$49</span>
            <span className="pb-2 text-[15px] font-black text-[#0068ff]">MXN</span>
          </div>
          <p className="mt-0.5 text-[13.5px] font-medium text-[#626a79]">Pago único · Sin suscripciones</p>
          <button className="mt-3 flex h-[48px] w-full items-center justify-center gap-2.5 rounded-[9px] bg-[#0068ff] text-[15px] font-black text-white transition duration-200 hover:-translate-y-0.5 active:scale-[0.98]" onClick={onUnlock}>
            Desbloquear mi CV profesional
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-3 grid grid-cols-1 divide-y divide-[#e2e8f0] rounded-[10px] border border-[#e7edf5] bg-white text-center text-[11px] font-black text-[#070b2f]">
          <TrustItem icon={<ShieldCheck className="h-5 w-5" />}>Pago único</TrustItem>
          <TrustItem icon={<Sparkles className="h-5 w-5" />}>Entrega inmediata</TrustItem>
          <TrustItem icon={<Lock className="h-5 w-5" />}>Tus datos están protegidos</TrustItem>
        </div>
      </section>
    </ScreenShell>
  );
}

function SuccessScreen({
  analysis,
  fileName,
  onDoc,
  onHome,
  onPdf,
}: {
  analysis: AnalysisResponse;
  fileName: string;
  onDoc: () => void;
  onHome: () => void;
  onPdf: () => void;
}) {
  return (
    <ScreenShell>
      <header className="flex items-center justify-between gap-2.5 px-5 pt-4">
        <BrandLogo />
        <button className="flex h-[38px] shrink-0 items-center gap-1.5 rounded-[6px] border border-[#cad8e8] bg-white px-2.5 text-[13.5px] font-black text-[#0c55b8]" onClick={onHome}>
          <Home className="h-4 w-4" />
          Ir al inicio
        </button>
      </header>

      <section className="px-5 pt-4 text-center">
        <div className="mx-auto grid h-[72px] w-[72px] place-items-center rounded-full bg-[#e4f9ef] text-[#0fbd68] shadow-[0_0_0_9px_rgba(228,249,239,0.45)]">
          <Check className="h-9 w-9" strokeWidth={5} />
        </div>
        <h1 className="mt-5 text-[28px] font-black leading-none tracking-[-0.035em] min-[390px]:text-[31px]">¡Tu CV está listo!</h1>
        <p className="mt-2.5 text-[14px] font-medium text-[#626a79]">Hemos generado tu versión mejorada.</p>
      </section>

      <section className="px-5 pt-4 pb-4">
        <div className="flex items-center gap-2.5 rounded-[12px] border border-[#e4e9f0] bg-white p-3 shadow-[0_6px_16px_rgba(15,25,55,0.04)]">
          <PdfIcon large />
          <div className="min-w-0 flex-1 text-left">
            <p className="truncate text-[15px] font-black min-[390px]:text-[17px]">
              CV_Optimizado_{(analysis?.improvedCV?.name || "usuario").replace(/\s+/g, "_")}.pdf
            </p>
            <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#dff8ec] px-2.5 py-1 text-[12px] font-black text-[#129853]">
              <CheckCircle2 className="h-4 w-4" />
              Generado
            </span>
          </div>
        </div>

        <div className="mt-4 space-y-2.5">
          <button className="flex h-[48px] w-full items-center justify-center gap-2.5 rounded-[9px] bg-[#0068ff] text-[15px] font-black text-white shadow-[0_10px_20px_rgba(0,104,255,0.18)] transition duration-200 hover:-translate-y-0.5 active:scale-[0.98]" onClick={onPdf} disabled={!analysis.deliveryDecision.allowDownload}>
            <Download className="h-5 w-5" />
            Descargar PDF
          </button>
          <button className="flex h-[46px] w-full items-center justify-center gap-2.5 rounded-[9px] border border-[#0068ff] bg-white text-[15px] font-black text-[#0068ff] transition duration-200 hover:-translate-y-0.5 active:scale-[0.98]" onClick={onDoc}>
            <FileDown className="h-5 w-5" />
            Descargar DOCX
          </button>
        </div>

        <h2 className="mt-5 text-center text-[18px] font-black">Qué mejoramos</h2>
        <div className="mt-3 grid grid-cols-1 gap-2.5">
          <ImprovedCard icon={<FileText className="h-7 w-7" />} title="Resumen optimizado">Reescribimos tu perfil para hacerlo más claro, impactante y relevante.</ImprovedCard>
          <ImprovedCard icon={<BarChart3 className="h-7 w-7" />} title="Logros reforzados" tone="green">Destacamos tus resultados con métricas y verbos de alto impacto.</ImprovedCard>
          <ImprovedCard icon={<Layers3 className="h-7 w-7" />} title="Formato limpio" tone="purple">Diseño profesional, escaneable y optimizado para los ATS.</ImprovedCard>
        </div>

        <ProtectedNote className="mt-5" />
        <p className="sr-only">Archivo original: {fileName}</p>
      </section>
    </ScreenShell>
  );
}

function ScreenShell({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14, filter: "blur(6px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      className="min-h-screen bg-white"
    >
      {children}
    </motion.div>
  );
}

function SimpleHeader() {
  return (
    <header className="px-5 pt-4">
      <BrandLogo />
    </header>
  );
}

function BackHeader({ onBack }: { onBack: () => void }) {
  return (
    <header className="flex items-center gap-2.5 px-5 pt-4">
      <button aria-label="Volver" className="text-[#070b2f]" onClick={onBack}>
        <ArrowLeft className="h-7 w-7" />
      </button>
      <BrandLogo />
    </header>
  );
}

function BrandLogoIcon({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Main document body outline */}
      <path
        d="M 58 15 H 32 C 22.6 15 15 22.6 15 32 V 68 C 15 77.4 22.6 85 32 85 H 50"
        stroke="#0068ff"
        strokeWidth="9.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Right edge below fold */}
      <path
        d="M 80 37 V 50"
        stroke="#0068ff"
        strokeWidth="9.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Curved Arrow inside the bottom-right gap */}
      <path
        d="M 50 85 C 65 85 80 75 80 56"
        stroke="#0068ff"
        strokeWidth="9.5"
        strokeLinecap="round"
      />
      {/* Arrowhead */}
      <path
        d="M 64 56 H 80 V 72"
        stroke="#0068ff"
        strokeWidth="9.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Fold flap in the top-right corner with smooth curve */}
      <path
        d="M 58 15 L 80 37 H 64 C 60.7 37 58 34.3 58 31 Z"
        fill="#7caeff"
      />
      {/* Horizontal lines representing document content */}
      <path
        d="M 30 42 H 58"
        stroke="#7caeff"
        strokeWidth="8.5"
        strokeLinecap="round"
      />
      <path
        d="M 30 58 H 48"
        stroke="#7caeff"
        strokeWidth="8.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function BrandLogo({ large = false }: { large?: boolean }) {
  return (
    <div className="flex items-center gap-2 select-none py-1 text-left justify-start">
      <BrandLogoIcon className={large ? "h-9 w-9" : "h-7 w-7"} />
      <span className={`font-black tracking-[-0.035em] text-[#070b2f] ${large ? "text-[24px]" : "text-[19px]"}`}>
        Blank<span className="text-[#0068ff]">ATS</span>
      </span>
    </div>
  );
}

function Badge({ children, icon }: { children: ReactNode; icon: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[#dbe8f8] bg-[#edf5ff] px-3.5 py-1 text-[13.5px] font-black text-[#0c55b8] shadow-[inset_0_1px_1px_rgba(255,255,255,0.9)]">
      <span className="text-[#0068ff]">{icon}</span>
      {children}
    </span>
  );
}

function HomeScoreCard() {
  return (
    <div className="grid grid-cols-1 items-center gap-3 rounded-[12px] border border-[#e4e9f0] bg-white p-3.5 shadow-[0_6px_16px_rgba(15,25,55,0.05)]">
      <ProgressRing value={78} mode="score" size={96} />
      <div className="border-t border-[#e8edf4] pt-3 text-left">
        <h2 className="text-[18px] font-black">Buen potencial</h2>
        <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-[#def8eb] px-2.5 py-1 text-[12px] font-black text-[#129853]">
          <CheckCircle2 className="h-4 w-4" />
          Análisis completado
        </span>
        <TinyIssue icon={<AlertTriangle className="h-4 w-4" />} text="Faltan palabras clave relevantes" />
        <TinyIssue icon={<AlertTriangle className="h-4 w-4" />} text="Formato menos compatible" amber />
        <TinyIssue icon={<Circle className="h-4 w-4" />} text="Poca cuantificación de logros" blue />
      </div>
    </div>
  );
}

function ProgressRing({ value, mode, size }: { value: number; mode: "score" | "percent"; size: number }) {
  const inner = size - 20;
  const numSize = size < 110 ? "text-[28px]" : mode === "percent" ? "text-[36px]" : "text-[32px]";
  const pctSize = size < 110 ? "text-[16px]" : "text-[19px]";
  const lblSize = size < 110 ? "text-[12px] mt-0.5" : "text-[14px] mt-1";
  return (
    <div className="mx-auto grid place-items-center rounded-full" style={{ width: size, height: size, background: `conic-gradient(${blue} 0deg ${value * 3.6}deg, #e8f1ff ${value * 3.6}deg 360deg)` }}>
      <div className="grid place-items-center rounded-full bg-white" style={{ width: inner, height: inner }}>
        <div className="text-center">
          <p className={`${numSize} font-black leading-none tracking-[-0.04em]`}>
            {value}
            {mode === "percent" ? <span className={pctSize}>%</span> : null}
          </p>
          <p className={`${lblSize} font-medium text-[#626a79]`}>
            {mode === "percent" ? (value === 100 ? "¡Listo!" : "Analizando...") : "/100"}
          </p>
        </div>
      </div>
    </div>
  );
}

function TinyIssue({ amber, blue: isBlue, icon, text }: { amber?: boolean; blue?: boolean; icon: ReactNode; text: string }) {
  return (
    <div className="mt-2.5 flex items-center gap-2 border-b border-[#eef2f6] pb-2 last:border-b-0">
      <span className={amber ? "text-[#d48624]" : isBlue ? "text-[#0c66d8]" : "text-[#cf334b]"}>{icon}</span>
      <span className="flex-1 text-[13.5px] font-medium leading-tight">{text}</span>
      <ChevronRight className="h-4 w-4 text-[#9ba4b2] shrink-0" />
    </div>
  );
}

function HowStep({ children, icon, number, title }: { children: ReactNode; icon: ReactNode; number: string; title: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-[11px] border border-[#e4e9f0] bg-white p-2.5 text-left shadow-[0_5px_12px_rgba(15,25,55,0.04)]">
      <div className="relative grid h-[44px] w-[44px] shrink-0 place-items-center rounded-full bg-[#edf5ff] text-[#0068ff]">
        <span className="absolute -left-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-[#0068ff] text-[12px] font-black text-white">{number}</span>
        {icon}
      </div>
      <div>
        <h3 className="text-[14.5px] font-black leading-5">{title}</h3>
        <p className="mt-0.5 text-[12px] font-medium leading-4 text-[#626a79]">{children}</p>
      </div>
    </div>
  );
}

function OfferCard({ onClick }: { onClick: () => void }) {
  return (
    <div className="rounded-[12px] border border-[#e4e9f0] bg-white p-3 shadow-[0_6px_16px_rgba(15,25,55,0.05)]">
      <div className="grid grid-cols-[48px_1fr] items-start gap-2.5">
        <div className="grid h-[42px] w-[42px] place-items-center rounded-full bg-white text-[#0068ff] shadow-[0_5px_15px_rgba(15,25,55,0.08)]">
          <Trophy className="h-5.5 w-5.5" />
        </div>
        <div className="min-w-0">
          <h2 className="text-[16.5px] font-black leading-5">Desbloquea tu CV profesional</h2>
          <p className="mt-0.5 text-[12.5px] font-medium leading-4 text-[#626a79]">Versión más clara, ordenada y lista para destacar.</p>
          <div className="mt-2.5 flex flex-wrap items-end gap-x-2.5 gap-y-1">
            <span className="pb-1 text-[14.5px] font-bold text-[#6f7682] line-through">$99 MXN</span>
            <span className="text-[32px] font-black leading-none">$49</span>
            <span className="pb-1 text-[14.5px] font-black text-[#0068ff]">MXN</span>
            <span className="mb-1 rounded-full bg-[#edf5ff] px-2 py-0.5 text-[11px] font-black text-[#0c55b8]">Pago único</span>
          </div>
        </div>
      </div>
      <button className="mt-3 flex h-[44px] w-full items-center justify-center gap-2 rounded-[6px] bg-[#0068ff] text-[14.5px] font-black text-white transition duration-200 hover:-translate-y-0.5 active:scale-[0.98]" onClick={onClick}>
        <Lock className="h-4 w-4" />
        Desbloquear mi CV profesional
      </button>
    </div>
  );
}

function ProtectedNote({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-3 text-center ${className}`}>
      <ShieldCheck className="h-6 w-6 text-[#0068ff]" />
      <p className="text-[12.5px] font-medium leading-4 text-[#626a79]">
        <span className="font-black text-[#070b2f]">Tus datos están protegidos.</span>
        <br />
        No compartimos tu información.
      </p>
    </div>
  );
}

function TabButton({ active, children, icon, onClick }: { active: boolean; children: ReactNode; icon: ReactNode; onClick: () => void }) {
  return (
    <button className={`flex items-center justify-center gap-2 rounded-[8px] text-[13.5px] font-black min-[390px]:gap-2.5 min-[390px]:text-[14.5px] ${active ? "bg-[#0068ff] text-white shadow-[0_8px_16px_rgba(0,104,255,0.22)]" : "text-[#5f6673]"}`} onClick={onClick}>
      {icon}
      {children}
    </button>
  );
}

function PdfIcon({ large = false }: { large?: boolean }) {
  return (
    <div className={`grid ${large ? "h-[72px] w-[72px]" : "h-[52px] w-[52px]"} shrink-0 place-items-center rounded-[10px] border border-[#f1d7d7] bg-white text-[#e1242f]`}>
      <FileText className={large ? "h-9 w-9" : "h-7 w-7"} />
      <span className="-mt-2 text-[11px] font-black">PDF</span>
    </div>
  );
}

function TimelineStep({ active, children, done, number, title }: { active?: boolean; children: ReactNode; done?: boolean; number: string; title: string }) {
  return (
    <div className="grid grid-cols-[28px_1fr] gap-2.5 pb-4 last:pb-0">
      <div className="relative flex justify-center">
        {number !== "4" ? <span className="absolute top-7 h-full w-px bg-[#d6f2e5]" /> : null}
        <span className={`relative z-10 grid h-7 w-7 place-items-center rounded-full text-[13px] font-black ${done ? "bg-[#9ff0c8] text-[#0f9f57]" : active ? "border-[3px] border-[#0068ff] bg-white text-[#0068ff]" : "bg-[#eef2f7] text-[#6f7682]"}`}>
          {done ? <Check className="h-4 w-4" strokeWidth={4} /> : active ? "" : number}
        </span>
      </div>
      <div>
        <h3 className={`text-[15px] font-black leading-5 min-[390px]:text-[16px] ${active ? "text-[#0068ff]" : "text-[#070b2f]"}`}>{number}.&nbsp;&nbsp;{title}</h3>
        <p className="mt-0.5 text-[12.5px] font-medium leading-5 text-[#626a79]">{children}</p>
      </div>
    </div>
  );
}

function EvalCard({ children, icon, title }: { children: ReactNode; icon: ReactNode; title: string }) {
  return (
    <div className="rounded-[11px] border border-[#e4e9f0] bg-white p-3 text-center shadow-[0_5px_12px_rgba(15,25,55,0.04)]">
      <div className="mx-auto grid h-8 w-8 place-items-center rounded-[10px] bg-[#edf5ff] text-[#0068ff]">{icon}</div>
      <h3 className="mt-2.5 text-[14.5px] font-black">{title}</h3>
      <p className="mt-1.5 text-[12px] font-medium leading-4 text-[#626a79]">{children}</p>
    </div>
  );
}

function problemRows(analysis: AnalysisResponse) {
  const labels = analysis?.problems || [];
  const severities = [
    { severity: "Alto", tone: "red" as const },
    { severity: "Medio", tone: "amber" as const },
    { severity: "Medio", tone: "amber" as const },
    { severity: "Bajo", tone: "blue" as const },
  ];
  return labels.map((label, index) => {
    const sev = severities[index] || { severity: "Bajo", tone: "blue" as const };
    return { label, ...sev };
  });
}

function SectionTitle({ number, title }: { number: string; title: string }) {
  return <h2 className="mt-4 mb-2 text-[15.5px] font-black">{number}. {title}</h2>;
}

function ProblemLine({ label, severity, tone }: { label: string; severity: string; tone: "red" | "amber" | "blue" }) {
  const colors = {
    red: "text-[#cf334b] bg-[#ffecef]",
    amber: "text-[#b96b13] bg-[#fff3e3]",
    blue: "text-[#0c66d8] bg-[#edf5ff]",
  };
  return (
    <div className="flex min-h-[44px] items-center gap-2.5 border-b border-[#edf0f5] px-3.5 py-2 last:border-b-0">
      <AlertTriangle className={`h-5 w-5 shrink-0 ${tone === "red" ? "text-[#cf334b]" : tone === "amber" ? "text-[#d48624]" : "text-[#0c66d8]"}`} />
      <span className="flex-1 text-[13px] font-medium leading-5">{label}</span>
      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11.5px] font-black ${colors[tone]}`}>{severity}</span>
      <ChevronRight className="h-4 w-4 shrink-0 text-[#9ba4b2]" />
    </div>
  );
}

function Chip({ children, ok, warn }: { children: ReactNode; ok?: boolean; warn?: boolean }) {
  return (
    <span className={`inline-flex h-[32px] items-center gap-1.5 rounded-full border px-3 text-[12.5px] font-medium shadow-[0_4px_10px_rgba(15,25,55,0.03)] ${ok ? "border-[#d7f2e5] bg-white text-[#15995a]" : warn ? "border-[#ffe2bd] bg-[#fff5e7] text-[#a86315]" : ""}`}>
      {ok ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
      {children}
    </span>
  );
}

function RecoCard({ children, icon, title }: { children: ReactNode; icon: ReactNode; title: string }) {
  return (
    <div className="rounded-[10px] border border-[#e4e9f0] bg-white p-3 shadow-[0_5px_12px_rgba(15,25,55,0.04)]">
      <div className="grid h-8 w-8 place-items-center rounded-full bg-[#edf5ff] text-[#0068ff]">{icon}</div>
      <h3 className="mt-2.5 text-[13.5px] font-black leading-5">{title}</h3>
      <p className="mt-1 text-[12px] font-medium leading-4 text-[#626a79]">{children}</p>
      <ChevronRight className="ml-auto mt-1 h-4 w-4 text-[#9ba4b2] shrink-0" />
    </div>
  );
}

function LockedPreview({ cv }: { cv: ImprovedCV }) {
  const firstExp = cv?.experience && cv.experience[0];
  return (
    <div className="relative grid grid-cols-1 overflow-hidden rounded-[12px] border border-[#d9e4f1] bg-white shadow-[0_6px_16px_rgba(15,25,55,0.04)]">
      <div className="p-3 pb-2 text-[12.5px] font-medium leading-5 text-[#626a79] border-b border-[#f1f5f9]">
        Esta es una vista previa de tu CV optimizado. Desbloquea la versión completa para conocer todos los detalles y descargarla.
      </div>
      
      {/* Partially Blurred Real CV Content */}
      <div className="relative select-none p-4 text-left blur-[2px] opacity-75">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-[#edf5ff] flex items-center justify-center font-black text-[#0068ff] text-base shrink-0">
            {cv?.name ? cv.name.charAt(0).toUpperCase() : "U"}
          </div>
          <div>
            <h3 className="text-[15.5px] font-black text-[#070b2f]">{cv?.name || "Tu Nombre"}</h3>
            <p className="text-[12px] font-medium text-[#0068ff] mt-0.5">{cv?.title || "Tu Título Profesional"}</p>
          </div>
        </div>
        
        <p className="mt-2.5 text-[10.5px] font-medium text-[#8a929f]">{cv?.contact || "contacto@email.com · Teléfono"}</p>
        
        <div className="mt-3 border-t border-[#f1f5f9] pt-3">
          <h4 className="text-[11.5px] font-black text-[#070b2f] uppercase tracking-wider">Resumen Profesional</h4>
          <p className="mt-1.5 text-[11px] leading-relaxed text-[#626a79] font-medium">
            {cv?.summary || "Resumen profesional redactado con enfoque de impacto..."}
          </p>
        </div>

        {firstExp && (
          <div className="mt-3 border-t border-[#f1f5f9] pt-3">
            <h4 className="text-[11.5px] font-black text-[#070b2f] uppercase tracking-wider">Experiencia Profesional</h4>
            <div className="mt-2">
              <div className="flex justify-between items-baseline">
                <h5 className="text-[11.5px] font-black text-[#070b2f]">{firstExp.role}</h5>
                <span className="text-[10px] font-medium text-[#8a929f]">{firstExp.period}</span>
              </div>
              <p className="text-[11px] font-bold text-[#0068ff] mt-0.5">{firstExp.company}</p>
              <ul className="mt-2 space-y-1.5 pl-4 list-disc text-[11px] leading-relaxed text-[#626a79] font-medium">
                {firstExp.bullets && firstExp.bullets.slice(0, 2).map((bullet, idx) => (
                  <li key={idx}>{bullet}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
      
      {/* Centered Lock Icon */}
      <div className="absolute inset-0 bg-white/10 backdrop-blur-[1px] flex items-center justify-center">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-white text-[#0068ff] shadow-[0_12px_32px_rgba(0,104,255,0.22)] border border-[#e2e8f0]">
          <Lock className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

function MiniCvLocked() {
  return (
    <div className="relative overflow-hidden rounded-[10px] bg-white p-4 blur-[1.8px]">
      <div className="h-9 w-9 rounded-full bg-[#d6dbe3]" />
      <div className="mt-3 h-3 w-32 rounded bg-[#cfd8e5]" />
      <div className="mt-2 h-2 w-40 rounded bg-[#dbe2ec]" />
      <div className="mt-4 space-y-2">
        <span className="block h-2 w-full rounded bg-[#dbe2ec]" />
        <span className="block h-2 w-10/12 rounded bg-[#dbe2ec]" />
        <span className="block h-2 w-11/12 rounded bg-[#dbe2ec]" />
      </div>
    </div>
  );
}

function TrustItem({ children, icon }: { children: ReactNode; icon: ReactNode }) {
  return (
    <div className="flex min-h-[42px] items-center justify-center gap-2.5 px-3 py-2 text-[#626a79]">
      <span className="text-[#0068ff] shrink-0">{icon}</span>
      <span>{children}</span>
    </div>
  );
}

function FeatureLine({ children, icon }: { children: ReactNode; icon: ReactNode }) {
  return (
    <div className="mt-2.5 flex items-center gap-2.5 border-b border-[#edf0f5] pb-2.5 last:border-b-0">
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-[8px] bg-[#edf5ff] text-[#0068ff]">{icon}</div>
      <span className="text-[14.5px] font-medium leading-5">{children}</span>
    </div>
  );
}

function ImprovedCard({ children, icon, title, tone = "blue" }: { children: ReactNode; icon: ReactNode; title: string; tone?: "blue" | "green" | "purple" }) {
  const colors = {
    blue: "bg-[#edf5ff] text-[#0068ff]",
    green: "bg-[#e9f9f0] text-[#18b965]",
    purple: "bg-[#f1e9ff] text-[#9b47f0]",
  };
  return (
    <div className="flex items-center gap-2.5 rounded-[11px] border border-[#e4e9f0] bg-white p-2.5 text-left shadow-[0_5px_12px_rgba(15,25,55,0.04)]">
      <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${colors[tone]}`}>{icon}</div>
      <div>
        <h3 className="text-[14.5px] font-black leading-5">{title}</h3>
        <p className="mt-1 text-[12px] font-medium leading-4 text-[#626a79]">{children}</p>
      </div>
    </div>
  );
}
