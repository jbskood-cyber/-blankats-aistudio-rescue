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
  Copy,
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
  X,
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
  vacancyMatchScore?: number;
  suggestedKeywords?: string[];
  qualityStatus: QualityStatus;
  processingMode: ProcessingMode;
  recommendedAction: RecommendedAction;
  extractionWarnings: string[];
  dataIntegrityWarnings: string[];
  problems: string[];
  missingSections: string[];
  recommendations: string[];
  diagnosis?: {
    headline: string;
    summary: string;
    scoreExplanation: string;
    mainFindings: string[];
    recommendationCards: {
      title: string;
      description: string;
    }[];
    improvementsMade: {
      title: string;
      description: string;
    }[];
  };
  improvedCV: ImprovedCV;
  deliveryDecision: {
    allowDownload: boolean;
    showWarningBeforeDownload: boolean;
    userMessage: string;
  };
}

type Screen = "home" | "upload" | "analyzing" | "diagnosis" | "paywall" | "success";
type InputMode = "pdf" | "text";
type VacancyMode = "paste" | "captures";
type RawRecord = Record<string, unknown>;

type VacancyCapture = {
  name: string;
  mimeType: string;
  data: string;
  size: number;
};

const demoAnalysis: AnalysisResponse = {
  score: 78,
  vacancyMatchScore: 68,
  suggestedKeywords: ["Excel", "Atención al cliente", "Inventario", "KPIs", "Trabajo en equipo"],
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

function buildCvRenderModel(improvedCV: ImprovedCV) {
  return {
    name: improvedCV.name || "",
    title: improvedCV.title || "",
    contact: improvedCV.contact || "",
    summary: improvedCV.summary || "",
    experience: (improvedCV.experience || []).map(exp => ({
      company: exp.company || "",
      role: exp.role || "",
      period: exp.period || "",
      bullets: exp.bullets || [],
      description: exp.description || "",
    })),
    education: (improvedCV.education || []).map(edu => ({
      institution: edu.institution || "",
      degree: edu.degree || "",
      period: edu.period || "",
      description: edu.description || "",
    })),
    skills: improvedCV.skills || [],
    projects: (improvedCV.projects || []).map(proj => ({
      name: proj.name || "",
      bullets: proj.bullets || [],
      period: proj.period || "",
      description: proj.description || "",
    })),
    certifications: improvedCV.certifications || [],
  };
}

function fitsDocxLine(text: string, maxChars = 90) {
  return text.replace(/\s+/g, " ").trim().length <= maxChars;
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const listener = (e: MediaQueryListEvent) => setReduced(e.matches);
    mediaQuery.addEventListener("change", listener);
    return () => mediaQuery.removeEventListener("change", listener);
  }, []);
  return reduced;
}

const animFadeUp = (reduced: boolean) => ({
  initial: { opacity: 0, y: reduced ? 0 : 14, filter: "blur(4px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] }
});

const animStagger = (reduced: boolean) => ({
  initial: {},
  animate: {
    transition: {
      staggerChildren: reduced ? 0 : 0.08,
    }
  }
});

export default function HomePage() {
  const [screen, setScreen] = useState<Screen>("home");
  const [inputMode, setInputMode] = useState<InputMode>("pdf");
  const [file, setFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [vacancyMode, setVacancyMode] = useState<VacancyMode>("paste");
  const [vacancyText, setVacancyText] = useState("");
  const [vacancyCaptures, setVacancyCaptures] = useState<VacancyCapture[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [visualNote, setVisualNote] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const vacancyCaptureInputRef = useRef<HTMLInputElement>(null);

  const [analyzingProgress, setAnalyzingProgress] = useState(0);
  const [analyzingMessage, setAnalyzingMessage] = useState("Leyendo el archivo…");
  const [analyzingStep, setAnalyzingStep] = useState(1);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const analyzingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Mercado Pago & Supabase Integration States
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderStatus, setOrderStatus] = useState<string | null>(null);
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [downloadToken, setDownloadToken] = useState<string | null>(null);
  const [checkoutMode, setCheckoutMode] = useState<"mock" | "sandbox" | "production">("production");

  const isDemoMode = typeof process !== "undefined" && process.env.NEXT_PUBLIC_DEMO_MODE === "true";
  const currentAnalysis = analysis ?? (isDemoMode ? demoAnalysis : null);
  const currentFileName = file?.name || "mi-cv.pdf";
  const canAnalyze = useMemo(() => Boolean(file || pastedText.trim()), [file, pastedText]);
  const hasRealAnalysis = Boolean(analysis);
  const hasVacancy = Boolean(vacancyText.trim() || vacancyCaptures.length > 0);

  useEffect(() => {
    fetch("/api/checkout/mode")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.checkoutMode === "mock" || data?.checkoutMode === "sandbox" || data?.checkoutMode === "production") {
          setCheckoutMode(data.checkoutMode);
        }
      })
      .catch(() => undefined);
  }, []);

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

  // Check for orderId in search params on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const queryOrderId = params.get("orderId");
      const queryStatus = params.get("status");

      if (queryOrderId) {
        queueMicrotask(() => {
          setOrderId(queryOrderId);
          setLoadingOrder(true);
          setScreen("success");
        });

        const fetchOrder = () => {
          fetch(`/api/orders/${queryOrderId}`)
            .then((res) => {
              if (!res.ok) throw new Error("No se pudo obtener la orden.");
              return res.json();
            })
            .then((orderData) => {
              setOrderStatus(orderData.status);
              if (orderData.status === "approved" && orderData.analysis && orderData.improvedCV) {
                setAnalysis({
                  qualityStatus: orderData.analysis.qualityStatus,
                  processingMode: orderData.analysis.processingMode,
                  recommendedAction: orderData.analysis.recommendedAction,
                  score: orderData.analysis.score,
                  vacancyMatchScore: orderData.analysis.vacancyMatchScore,
                  suggestedKeywords: orderData.analysis.suggestedKeywords || [],
                  extractionWarnings: orderData.analysis.extractionWarnings || [],
                  dataIntegrityWarnings: orderData.analysis.dataIntegrityWarnings || [],
                  problems: orderData.analysis.problems || [],
                  missingSections: orderData.analysis.missingSections || [],
                  diagnosis: orderData.analysis.diagnosis,
                  recommendations: orderData.analysis.recommendations || [],
                  deliveryDecision: {
                    allowDownload: true,
                    showWarningBeforeDownload: false,
                    userMessage: "Pago aprobado. Descarga disponible.",
                  },
                  improvedCV: orderData.improvedCV,
                });
                setDownloadToken(orderData.download_token || null);
                setFile({ name: orderData.original_file_name || "mi-cv.pdf" } as File);
                setScreen("success");
              } else if (orderData.status === "pending") {
                setScreen("success");
              } else {
                setScreen("paywall");
                setOrderError("El pago no fue aprobado o fue cancelado. Por favor, intenta de nuevo.");
              }
            })
            .catch((err) => {
              console.error("Error loading order:", err);
              setOrderError("Error al cargar los datos del pago.");
              setScreen("paywall");
            })
            .finally(() => {
              setLoadingOrder(false);
            });
        };

        fetchOrder();
      }
    }
  }, []);

  const refreshOrder = async () => {
    if (!orderId) return;
    setLoadingOrder(true);
    setOrderError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}`);
      if (!res.ok) throw new Error("Error checking status");
      const orderData = await res.json();
      setOrderStatus(orderData.status);
      if (orderData.status === "approved" && orderData.analysis && orderData.improvedCV) {
        setAnalysis({
          qualityStatus: orderData.analysis.qualityStatus,
          processingMode: orderData.analysis.processingMode,
          recommendedAction: orderData.analysis.recommendedAction,
          score: orderData.analysis.score,
          vacancyMatchScore: orderData.analysis.vacancyMatchScore,
          suggestedKeywords: orderData.analysis.suggestedKeywords || [],
          extractionWarnings: orderData.analysis.extractionWarnings || [],
          dataIntegrityWarnings: orderData.analysis.dataIntegrityWarnings || [],
          problems: orderData.analysis.problems || [],
          missingSections: orderData.analysis.missingSections || [],
          diagnosis: orderData.analysis.diagnosis,
          recommendations: orderData.analysis.recommendations || [],
          deliveryDecision: {
            allowDownload: true,
            showWarningBeforeDownload: false,
            userMessage: "Pago aprobado. Descarga disponible.",
          },
          improvedCV: orderData.improvedCV,
        });
        setDownloadToken(orderData.download_token || null);
        setFile({ name: orderData.original_file_name || "mi-cv.pdf" } as File);
        setScreen("success");
      } else if (orderData.status === "rejected") {
        setScreen("paywall");
        setOrderError("El pago fue rechazado. Intenta de nuevo.");
      }
    } catch (err) {
      console.error(err);
      setOrderError("No se pudo verificar el estado en este momento.");
    } finally {
      setLoadingOrder(false);
    }
  };

  const handleCheckout = async () => {
    if (!currentAnalysis) return;
    setIsCheckingOut(true);
    setCheckoutError(null);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysis: currentAnalysis,
          improvedCV: currentAnalysis.improvedCV,
          fileName: currentFileName,
          customerEmail: currentAnalysis.improvedCV?.contact || "",
        }),
      });

      if (!response.ok) {
        let errorMessage = "No se pudo iniciar el proceso de pago.";
        try {
          const errData = await response.json();
          errorMessage = errData.error || errorMessage;
          if (errData.details) {
            errorMessage = `${errorMessage}: ${String(errData.details).slice(0, 300)}`;
          }
        } catch {}
        throw new Error(errorMessage);
      }

      const data = await response.json();
      if (data.init_point) {
        window.location.href = data.init_point;
      } else {
        throw new Error("No se recibió el punto de inicio de pago.");
      }
    } catch (err: any) {
      console.error("Checkout error:", err);
      setCheckoutError(err.message || "Error al conectar con la pasarela de pagos.");
    } finally {
      setIsCheckingOut(false);
    }
  };

  useEffect(() => {
    if (!currentAnalysis && !loadingOrder && (screen === "diagnosis" || screen === "paywall" || screen === "success")) {
      queueMicrotask(() => setScreen("upload"));
    }
  }, [screen, currentAnalysis, loadingOrder]);

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

  const handleVacancyCaptureChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files || []).slice(0, Math.max(0, 2 - vacancyCaptures.length));
    if (selected.length === 0) return;

    try {
      const compressed = await Promise.all(selected.map(compressVacancyImage));
      setVacancyCaptures((current) => [...current, ...compressed].slice(0, 2));
      setVisualNote(null);
    } catch (err) {
      console.error("Error compressing vacancy image:", err);
      setVisualNote("No se pudo procesar la captura. Intenta con una imagen normal de tu celular.");
    } finally {
      event.target.value = "";
    }
  };

  const removeVacancyCapture = (index: number) => {
    setVacancyCaptures((current) => current.filter((_, itemIndex) => itemIndex !== index));
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
    const vacancyProvided = Boolean(vacancyText.trim() || vacancyCaptures.length > 0);
    if (analyzingIntervalRef.current) {
      clearInterval(analyzingIntervalRef.current);
    }

    if (!canAnalyze) {
      if (isDemoMode) {
        setScreen("analyzing");
        setVisualNote(null);
        setAnalyzingProgress(10);
        setAnalyzingStep(1);
        setAnalyzingMessage(vacancyProvided ? "Evaluando claridad, estructura y ajuste con la vacante." : "Leyendo el archivo…");
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
          let msg = vacancyProvided ? "Evaluando claridad, estructura y ajuste con la vacante." : "Leyendo el archivo…";
          if (progress >= 100) {
            step = vacancyProvided ? 5 : 4;
            msg = "Diagnóstico listo";
          } else {
            if (vacancyProvided) {
              if (progress < 20) {
                step = 1;
                msg = "Extrayendo texto del CV…";
              } else if (progress < 40) {
                step = 2;
                msg = "Analizando contenido y estructura…";
              } else if (progress < 60) {
                step = 3;
                msg = "Detectando palabras clave…";
              } else if (progress < 80) {
                step = 4;
                msg = "Comparando con vacante…";
              } else {
                step = 5;
                msg = "Generando versión mejorada…";
              }
            } else if (progress < 25) {
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

          if (!vacancyProvided && progress < 100) {
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
    setAnalyzingMessage(vacancyProvided ? "Evaluando claridad, estructura y ajuste con la vacante." : "Leyendo el archivo…");
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
            vacancyText: vacancyText.trim() || undefined,
            vacancyImages: vacancyCaptures.map((capture) => ({
              mimeType: capture.mimeType,
              data: capture.data,
            })),
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
      let msg = vacancyProvided ? "Evaluando claridad, estructura y ajuste con la vacante." : "Leyendo el archivo…";
      if (progress >= 100) {
        step = vacancyProvided ? 5 : 4;
        msg = "Diagnóstico listo";
      } else {
        if (vacancyProvided) {
          if (progress < 20) {
            step = 1;
            msg = "Extrayendo texto del CV…";
          } else if (progress < 40) {
            step = 2;
            msg = "Analizando contenido y estructura…";
          } else if (progress < 60) {
            step = 3;
            msg = "Detectando palabras clave…";
          } else if (progress < 80) {
            step = 4;
            msg = "Comparando con vacante…";
          } else {
            step = 5;
            msg = "Generando versión mejorada…";
          }
        } else if (progress < 25) {
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

      if (!vacancyProvided && progress < 100) {
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

      const cv = buildCvRenderModel(currentAnalysis.improvedCV);

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

      // Professional Summary
      if (cv.summary) {
        if (currentY + 20 > pageHeight - margin) {
          doc.addPage();
          currentY = margin + 10;
        } else {
          currentY += 4; // reduced from 15 (5 + 10) to 4 for tight, neat spacing between contact text and the divider line
        }
        
        // Solid thin gray line (similar to section header line)
        doc.setDrawColor(colorLine[0], colorLine[1], colorLine[2]);
        doc.setLineWidth(0.75);
        const summaryLineY = currentY - 6;
        doc.line(margin, summaryLineY, pageWidth - margin, summaryLineY);
        currentY += 8; // Keep the same currentY adjustment so that the text of the summary starts exactly where it did before!

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
        BorderStyle
      } = await import("docx");

      const cv = buildCvRenderModel(currentAnalysis.improvedCV);
      const docChildren: any[] = [];

      // Helper to create Section Header with a thin bottom line
      const createSectionHeader = (title: string) => {
        return new Paragraph({
          spacing: { before: 200, after: 120 },
          border: {
            bottom: {
              color: "D1D5DB",
              space: 4,
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

      // 1. Name
      docChildren.push(
        new Paragraph({
          spacing: { before: 0, after: 120 },
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
            spacing: { before: 0, after: 80 },
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
            spacing: { before: 0, after: 100 },
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
        docChildren.push(
          new Paragraph({
            spacing: { before: 40, after: 60 },
            border: {
              bottom: {
                color: "D1D5DB",
                space: 4,
                style: BorderStyle.SINGLE,
                size: 6, // 0.75pt line thickness
              }
            }
          })
        );
        docChildren.push(
          new Paragraph({
            spacing: { before: 100, after: 240, line: 270 }, // 13.5pt line spacing
            children: [
              new TextRun({
                text: cv.summary,
                size: 19, // 9.5pt
                font: "Arial",
                color: "111827",
              })
            ]
          })
        );
      }

      // 5. Experience
      if (cv.experience && cv.experience.length > 0) {
        docChildren.push(createSectionHeader("EXPERIENCIA LABORAL"));
        cv.experience.forEach((exp, idx) => {
          const roleText = exp.role || "";
          const companyText = exp.company || "";
          const periodText = exp.period || "";
          
          const isFirst = idx === 0;
          const full = `${roleText} — ${companyText} ${periodText}`.trim();
          const secondary = `${companyText} ${periodText}`.trim();

          if (fitsDocxLine(full, 90)) {
            // Caso A: One line (with right-aligned tab stop for period)
            docChildren.push(
              new Paragraph({
                spacing: { before: isFirst ? 120 : 180, after: 60 },
                tabStops: [
                  {
                    type: "right",
                    position: 9000,
                  }
                ],
                children: [
                  new TextRun({
                    text: roleText,
                    bold: true,
                    size: 20, // 10pt
                    font: "Arial",
                    color: "0F172A",
                  }),
                  new TextRun({
                    text: ` — ${companyText}`,
                    size: 20, // 10pt
                    font: "Arial",
                    color: "374151",
                  }),
                  new TextRun({
                    text: `\t${periodText}`,
                    italics: true,
                    size: 18, // 9pt
                    font: "Arial",
                    color: "374151",
                  }),
                ],
              })
            );
          } else if (fitsDocxLine(secondary, 80)) {
            // Caso B: Two lines
            // Line 1: Role only
            docChildren.push(
              new Paragraph({
                spacing: { before: isFirst ? 120 : 180, after: 20 },
                children: [
                  new TextRun({
                    text: roleText,
                    bold: true,
                    size: 20, // 10pt
                    font: "Arial",
                    color: "0F172A",
                  }),
                ],
              })
            );
            // Line 2: Company and right-aligned Period
            docChildren.push(
              new Paragraph({
                spacing: { before: 0, after: 60 },
                tabStops: [
                  {
                    type: "right",
                    position: 9000,
                  }
                ],
                children: [
                  new TextRun({
                    text: companyText,
                    size: 20, // 10pt
                    font: "Arial",
                    color: "374151",
                  }),
                  new TextRun({
                    text: `\t${periodText}`,
                    italics: true,
                    size: 18, // 9pt
                    font: "Arial",
                    color: "374151",
                  }),
                ],
              })
            );
          } else {
            // Caso C: Three lines
            // Line 1: Role
            docChildren.push(
              new Paragraph({
                spacing: { before: isFirst ? 120 : 180, after: 20 },
                children: [
                  new TextRun({
                    text: roleText,
                    bold: true,
                    size: 20, // 10pt
                    font: "Arial",
                    color: "0F172A",
                  }),
                ],
              })
            );
            // Line 2: Company
            docChildren.push(
              new Paragraph({
                spacing: { before: 0, after: 20 },
                children: [
                  new TextRun({
                    text: companyText,
                    size: 20, // 10pt
                    font: "Arial",
                    color: "374151",
                  }),
                ],
              })
            );
            // Line 3: Period
            docChildren.push(
              new Paragraph({
                spacing: { before: 0, after: 60 },
                children: [
                  new TextRun({
                    text: periodText,
                    italics: true,
                    size: 18, // 9pt
                    font: "Arial",
                    color: "374151",
                  }),
                ],
              })
            );
          }
          
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

      // 6. Education
      if (cv.education && cv.education.length > 0) {
        docChildren.push(createSectionHeader("EDUCACIÓN"));
        cv.education.forEach((edu, idx) => {
          const degreeText = edu.degree || "";
          const institutionText = edu.institution || "";
          const periodText = edu.period || "";
          
          const isFirst = idx === 0;
          const full = `${degreeText} — ${institutionText} ${periodText}`.trim();
          const secondary = `${institutionText} ${periodText}`.trim();

          if (fitsDocxLine(full, 90)) {
            // Caso A: One line
            docChildren.push(
              new Paragraph({
                spacing: { before: isFirst ? 120 : 180, after: 60 },
                tabStops: [
                  {
                    type: "right",
                    position: 9000,
                  }
                ],
                children: [
                  new TextRun({
                    text: degreeText,
                    bold: true,
                    size: 20, // 10pt
                    font: "Arial",
                    color: "0F172A",
                  }),
                  new TextRun({
                    text: ` — ${institutionText}`,
                    size: 20, // 10pt
                    font: "Arial",
                    color: "374151",
                  }),
                  new TextRun({
                    text: `\t${periodText}`,
                    italics: true,
                    size: 18, // 9pt
                    font: "Arial",
                    color: "374151",
                  }),
                ],
              })
            );
          } else if (fitsDocxLine(secondary, 80)) {
            // Caso B: Two lines
            // Line 1: Degree only
            docChildren.push(
              new Paragraph({
                spacing: { before: isFirst ? 120 : 180, after: 20 },
                children: [
                  new TextRun({
                    text: degreeText,
                    bold: true,
                    size: 20, // 10pt
                    font: "Arial",
                    color: "0F172A",
                  }),
                ],
              })
            );
            // Line 2: Institution and Period
            docChildren.push(
              new Paragraph({
                spacing: { before: 0, after: 60 },
                tabStops: [
                  {
                    type: "right",
                    position: 9000,
                  }
                ],
                children: [
                  new TextRun({
                    text: institutionText,
                    size: 20, // 10pt
                    font: "Arial",
                    color: "374151",
                  }),
                  new TextRun({
                    text: `\t${periodText}`,
                    italics: true,
                    size: 18, // 9pt
                    font: "Arial",
                    color: "374151",
                  }),
                ],
              })
            );
          } else {
            // Caso C: Three lines
            // Line 1: Degree
            docChildren.push(
              new Paragraph({
                spacing: { before: isFirst ? 120 : 180, after: 20 },
                children: [
                  new TextRun({
                    text: degreeText,
                    bold: true,
                    size: 20, // 10pt
                    font: "Arial",
                    color: "0F172A",
                  }),
                ],
              })
            );
            // Line 2: Institution
            docChildren.push(
              new Paragraph({
                spacing: { before: 0, after: 20 },
                children: [
                  new TextRun({
                    text: institutionText,
                    size: 20, // 10pt
                    font: "Arial",
                    color: "374151",
                  }),
                ],
              })
            );
            // Line 3: Period
            docChildren.push(
              new Paragraph({
                spacing: { before: 0, after: 60 },
                children: [
                  new TextRun({
                    text: periodText,
                    italics: true,
                    size: 18, // 9pt
                    font: "Arial",
                    color: "374151",
                  }),
                ],
              })
            );
          }
          
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
        docChildren.push(
          new Paragraph({
            spacing: { before: 120, after: 120, line: 270 },
            children: [
              new TextRun({
                text: skillsJoined,
                size: 19, // 9.5pt
                font: "Arial",
                color: "111827",
              })
            ]
          })
        );
      }

      // 8. Projects
      if (cv.projects && cv.projects.length > 0) {
        docChildren.push(createSectionHeader("PROYECTOS"));
        cv.projects.forEach((proj, idx) => {
          const projName = proj.name || "";
          const projPeriod = proj.period || "";
          
          const isFirst = idx === 0;
          const full = projPeriod ? `${projName} ${projPeriod}`.trim() : projName;

          if (fitsDocxLine(full, 90)) {
            docChildren.push(
              new Paragraph({
                spacing: { before: isFirst ? 120 : 180, after: 60 },
                tabStops: [
                  {
                    type: "right",
                    position: 9000,
                  }
                ],
                children: [
                  new TextRun({
                    text: projName,
                    bold: true,
                    size: 20, // 10pt
                    font: "Arial",
                    color: "0F172A",
                  }),
                  projPeriod ? new TextRun({
                    text: `\t${projPeriod}`,
                    italics: true,
                    size: 18, // 9pt
                    font: "Arial",
                    color: "374151",
                  }) : new TextRun(""),
                ],
              })
            );
          } else {
            docChildren.push(
              new Paragraph({
                spacing: { before: isFirst ? 120 : 180, after: 20 },
                children: [
                  new TextRun({
                    text: projName,
                    bold: true,
                    size: 20, // 10pt
                    font: "Arial",
                    color: "0F172A",
                  }),
                ],
              })
            );
            if (projPeriod) {
              docChildren.push(
                new Paragraph({
                  spacing: { before: 0, after: 60 },
                  children: [
                    new TextRun({
                      text: projPeriod,
                      italics: true,
                      size: 18, // 9pt
                      font: "Arial",
                      color: "374151",
                    }),
                  ],
                })
              );
            }
          }
          
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
    setDownloadToken(null);
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
            vacancyCaptureInputRef={vacancyCaptureInputRef}
            vacancyCaptures={vacancyCaptures}
            vacancyMode={vacancyMode}
            vacancyText={vacancyText}
            onAnalyze={runAnalysis}
            onBack={() => setScreen("home")}
            onDrag={handleDrag}
            onDrop={handleDrop}
            onFileChange={handleFileChange}
            onRemoveVacancyCapture={removeVacancyCapture}
            onVacancyCaptureChange={handleVacancyCaptureChange}
            onVacancyMode={setVacancyMode}
            onVacancyText={setVacancyText}
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
            hasVacancy={hasVacancy}
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
          <PaywallScreen 
            onBack={() => setScreen("diagnosis")} 
            onUnlock={handleCheckout} 
            isCheckingOut={isCheckingOut}
            checkoutMode={checkoutMode}
            error={checkoutError || orderError}
          />
        ) : null}
        {screen === "success" && (currentAnalysis || loadingOrder) ? (
          <SuccessScreen
            analysis={currentAnalysis}
            fileName={currentFileName}
            onDoc={downloadDoc}
            onHome={goHome}
            onPdf={downloadPDF}
            orderStatus={orderStatus}
            loadingOrder={loadingOrder}
            onRefreshOrder={refreshOrder}
            downloadToken={downloadToken}
          />
        ) : null}
      </div>
    </main>
  );
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function compressVacancyImage(file: File): Promise<VacancyCapture> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("El archivo no es una imagen."));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer la imagen."));
    reader.onload = () => {
      const img = new window.Image();
      img.onerror = () => reject(new Error("No se pudo cargar la imagen."));
      img.onload = () => {
        const maxSide = 1280;
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("No se pudo preparar la compresión."));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.74);
        const data = dataUrl.split(",")[1] || "";
        resolve({
          name: file.name,
          mimeType: "image/jpeg",
          data,
          size: Math.round((data.length * 3) / 4),
        });
      };
      img.src = String(reader.result || "");
    };
    reader.readAsDataURL(file);
  });
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
  const reduced = usePrefersReducedMotion();
  const stagger = animStagger(reduced);
  const fadeUp = animFadeUp(reduced);

  return (
    <ScreenShell>
      <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-4">
        <motion.div variants={fadeUp}>
          <SimpleHeader />
        </motion.div>

        <motion.section variants={fadeUp} className="px-5 pt-1 text-center">
          <h1 className="text-[27px] font-black leading-[1.1] tracking-[-0.03em] min-[390px]:text-[29px]">
            Mejora tu CV
            <span className="block text-[#0068ff]">antes de enviarlo</span>
          </h1>
          <p className="mx-auto mt-2 max-w-[320px] text-[14px] font-medium leading-5 text-[#626a79]">
            Recibe un diagnóstico gratuito y desbloquea una versión profesional más clara, ordenada y lista para descargar.
          </p>
          <button 
            className="relative overflow-hidden mt-4 flex h-[48px] w-full items-center justify-center gap-2.5 rounded-[9px] bg-[#0068ff] text-[15px] font-black text-white shadow-[0_10px_20px_rgba(0,104,255,0.18)] transition duration-200 hover:-translate-y-0.5 active:scale-[0.98]" 
            onClick={() => onGo("upload")}
          >
            <Sparkles className="h-4.5 w-4.5" />
            Analizar mi CV gratis
            {!reduced && (
              <motion.div
                className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 pointer-events-none"
                animate={{
                  left: ["-100%", "200%"],
                }}
                transition={{
                  repeat: Infinity,
                  repeatDelay: 3.5,
                  duration: 1.4,
                  ease: "easeInOut",
                }}
              />
            )}
          </button>
        </motion.section>

        <motion.section variants={fadeUp} className="px-5 pt-0">
          <HomeScoreCard />
        </motion.section>

        <motion.section variants={fadeUp} className="px-5 pt-0">
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
        </motion.section>

        <motion.section variants={fadeUp} className="px-5 pt-0">
          <OfferCard onClick={() => onGo(hasRealAnalysis ? "paywall" : "upload")} />
        </motion.section>

        <motion.div variants={fadeUp}>
          <ProtectedNote className="mt-1 pb-4" />
        </motion.div>
      </motion.div>
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
  vacancyCaptureInputRef,
  vacancyCaptures,
  vacancyMode,
  vacancyText,
  onAnalyze,
  onBack,
  onDrag,
  onDrop,
  onFileChange,
  onRemoveVacancyCapture,
  onVacancyCaptureChange,
  onVacancyMode,
  onVacancyText,
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
  vacancyCaptureInputRef: React.RefObject<HTMLInputElement | null>;
  vacancyCaptures: VacancyCapture[];
  vacancyMode: VacancyMode;
  vacancyText: string;
  onAnalyze: () => void;
  onBack: () => void;
  onDrag: (event: DragEvent<HTMLDivElement>) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemoveVacancyCapture: (index: number) => void;
  onVacancyCaptureChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onVacancyMode: (mode: VacancyMode) => void;
  onVacancyText: (text: string) => void;
  onMode: (mode: InputMode) => void;
  onText: (text: string) => void;
}) {
  const reduced = usePrefersReducedMotion();
  const stagger = animStagger(reduced);
  const fadeUp = animFadeUp(reduced);

  return (
    <ScreenShell>
      <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-4">
        <motion.div variants={fadeUp}>
          <BackHeader onBack={onBack} />
        </motion.div>
        
        <motion.section variants={fadeUp} className="px-5 pt-1 text-center">
          <Badge icon={<CloudUpload className="h-4 w-4" />}>Carga de CV</Badge>
          <h1 className="mt-3 text-[28px] font-black leading-none tracking-[-0.035em] min-[390px]:text-[31px]">
            Sube tu <span className="text-[#0068ff]">CV</span>
          </h1>
          <p className="mx-auto mt-2 max-w-[320px] text-[14px] font-medium leading-6 text-[#626a79]">
            Carga tu archivo PDF o pega el texto de tu currículum para recibir un diagnóstico gratuito.
          </p>
        </motion.section>

        <motion.section variants={fadeUp} className="px-5 pt-1">
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
              <motion.div
                className={`relative grid min-h-[150px] place-items-center rounded-[10px] border-2 border-dashed p-3 text-center ${
                  dragActive ? "border-[#0068ff] bg-[#f4f8ff]" : "border-[#8aa5c7] bg-white"
                }`}
                onDragEnter={onDrag}
                onDragLeave={onDrag}
                onDragOver={onDrag}
                onDrop={onDrop}
                whileHover={reduced ? {} : { scale: 1.01, borderColor: "#0068ff", backgroundColor: "#f9fbff" }}
                whileTap={reduced ? {} : { scale: 0.99 }}
                transition={{ duration: 0.2 }}
              >
                <input ref={fileInputRef} type="file" accept="application/pdf" className="sr-only" onChange={onFileChange} />
                <button className="absolute inset-0 cursor-pointer" aria-label="Seleccionar PDF" onClick={() => fileInputRef.current?.click()} type="button" />
                
                <motion.div 
                  key={file ? "selected" : "empty"}
                  initial={{ scale: reduced ? 1 : 0.93, opacity: 0.85 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 350, damping: 22 }}
                  className="w-full max-w-full min-w-0 overflow-hidden flex flex-col items-center"
                >
                  <motion.div 
                    className="mx-auto grid h-[52px] w-[52px] place-items-center rounded-full bg-[#edf5ff] text-[#0068ff]"
                    whileHover={reduced ? {} : { y: -4, scale: 1.05 }}
                    transition={{ type: "spring", stiffness: 300, damping: 15 }}
                  >
                    <FileText className="h-6 w-6" />
                  </motion.div>
                  <h2
                    className="mx-auto mt-3.5 block w-full max-w-[240px] min-[390px]:max-w-[80%] overflow-hidden text-ellipsis whitespace-nowrap px-1 text-[16px] font-black tracking-[-0.02em] break-normal text-center"
                    title={file ? file.name : undefined}
                  >
                    {file ? compactFileName(file.name) : <>Arrastra o <span className="text-[#0068ff]">selecciona</span> tu CV</>}
                  </h2>
                  <p className="mt-1 text-[13px] font-medium text-[#8a929f]">Solo PDF · Máx. 10 MB</p>
                </motion.div>
              </motion.div>
            ) : (
              <textarea
                value={pastedText}
                onChange={(event) => onText(event.target.value)}
                className="min-h-[150px] w-full resize-none rounded-[10px] border-2 border-dashed border-[#8aa5c7] bg-white p-3 text-[14px] leading-5 text-[#070b2f] outline-none placeholder:text-[#8a929f] transition duration-200 focus:border-[#0068ff]"
                placeholder="Pega aquí el texto de tu currículum para recibir el diagnóstico visual."
              />
            )}
          </div>
        </motion.section>

        <motion.section variants={fadeUp} className="px-5 pt-0">
          <div className="rounded-[14px] border border-[#e8edf4] bg-white p-3.5 shadow-[0_8px_20px_rgba(15,25,55,0.05)]">
            <div className="mb-3 flex items-start gap-2.5 text-left">
              <div className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-full bg-[#edf5ff] text-[#0068ff]">
                <Search className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-[15px] font-black leading-5">Vacante objetivo <span className="font-medium text-[#8a929f]">(opcional)</span></h2>
                <p className="mt-0.5 text-[12.5px] font-medium leading-4 text-[#626a79]">Ayuda a personalizar tu CV para una oferta real.</p>
              </div>
            </div>

            <div className="grid h-[40px] grid-cols-2 rounded-[10px] border border-[#dbe2ec] bg-white p-1">
              <TabButton active={vacancyMode === "paste"} icon={<FileText className="h-4.5 w-4.5" />} onClick={() => onVacancyMode("paste")}>
                Pegar vacante
              </TabButton>
              <TabButton active={vacancyMode === "captures"} icon={<Upload className="h-4.5 w-4.5" />} onClick={() => onVacancyMode("captures")}>
                Capturas (máx. 2)
              </TabButton>
            </div>

            {vacancyMode === "paste" ? (
              <div className="mt-3">
                <textarea
                  value={vacancyText}
                  maxLength={4000}
                  onChange={(event) => onVacancyText(event.target.value)}
                  className="min-h-[92px] w-full resize-none rounded-[10px] border border-[#dbe2ec] bg-white p-3 text-[13.5px] leading-5 text-[#070b2f] outline-none placeholder:text-[#8a929f] transition duration-200 focus:border-[#0068ff]"
                  placeholder="Pega aquí la descripción de la vacante..."
                />
                <p className="mt-1.5 text-right text-[12px] font-medium text-[#8a929f]">{vacancyText.length}/4000</p>
              </div>
            ) : (
              <div className="mt-3">
                <input
                  ref={vacancyCaptureInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  onChange={onVacancyCaptureChange}
                />
                <button
                  type="button"
                  disabled={vacancyCaptures.length >= 2}
                  onClick={() => vacancyCaptureInputRef.current?.click()}
                  className="flex min-h-[74px] w-full flex-col items-center justify-center gap-1.5 rounded-[10px] border border-dashed border-[#8aa5c7] bg-[#fbfdff] px-3 text-center text-[13.5px] font-black text-[#0068ff] disabled:cursor-not-allowed disabled:opacity-55"
                >
                  <Upload className="h-5 w-5" />
                  Agregar captura de la vacante
                  <span className="text-[12px] font-medium text-[#8a929f]">{vacancyCaptures.length}/2 capturas</span>
                </button>
                {vacancyCaptures.length > 0 ? (
                  <div className="mt-2 space-y-2">
                    {vacancyCaptures.map((capture, index) => (
                      <div key={`${capture.name}-${index}`} className="flex items-center gap-2 rounded-[9px] border border-[#edf0f5] bg-white px-2.5 py-2">
                        <FileText className="h-4 w-4 shrink-0 text-[#0068ff]" />
                        <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-[12.5px] font-bold text-[#070b2f]" title={capture.name}>
                          {compactFileName(capture.name, 32)}
                        </span>
                        <button type="button" aria-label="Quitar captura" onClick={() => onRemoveVacancyCapture(index)} className="grid h-7 w-7 place-items-center rounded-full border border-[#e4e9f0] text-[#626a79]">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </motion.section>

        <motion.section variants={fadeUp} className="px-5 pt-0">
          <div className="flex items-center gap-2.5 rounded-[12px] border border-[#e7edf5] bg-white p-3 shadow-[0_6px_16px_rgba(15,25,55,0.04)]">
            <div className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-full bg-[#edf5ff] text-[#0068ff]">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <p className="text-[13.5px] font-medium leading-5 text-[#626a79] text-left">
              <span className="font-black text-[#070b2f]">Tus datos están protegidos.</span> No compartimos tu información y tu archivo se usa solo para el análisis.
            </p>
          </div>

          {note ? <p className="mt-3 rounded-[10px] bg-[#fff7e9] px-3.5 py-2.5 text-[13px] font-bold leading-5 text-[#935a12]">{note}</p> : null}

          <motion.button 
            className="mt-4 flex h-[48px] w-full items-center justify-center gap-2.5 rounded-[9px] bg-[#0068ff] text-[15px] font-black text-white shadow-[0_10px_20px_rgba(0,104,255,0.18)] disabled:bg-[#9fc7ff]" 
            disabled={!canAnalyze} 
            onClick={onAnalyze}
            whileTap={reduced ? {} : { scale: 0.985 }}
            whileHover={reduced ? {} : { translateY: -1.5 }}
            transition={{ duration: 0.2 }}
          >
            <Sparkles className="h-5 w-5" />
            Analizar mi CV
          </motion.button>
        </motion.section>
      </motion.div>
    </ScreenShell>
  );
}

function AnalyzingScreen({
  fileName,
  progress,
  activeStep,
  loadingMessage,
  file,
  hasVacancy,
}: {
  fileName: string;
  progress: number;
  activeStep: number;
  loadingMessage: string;
  file: File | null;
  hasVacancy: boolean;
}) {
  const reduced = usePrefersReducedMotion();
  const stagger = animStagger(reduced);
  const fadeUp = animFadeUp(reduced);

  const getFileInfo = () => {
    if (!file) {
      return "Texto copiado · CV";
    }
    const sizeKb = (file.size / 1024).toFixed(1);
    return `${sizeKb} KB · PDF`;
  };

  return (
    <ScreenShell>
      <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-4">
        <motion.div variants={fadeUp}>
          <SimpleHeader />
        </motion.div>

        <motion.section variants={fadeUp} className="px-5 pt-1 text-center">
          <Badge icon={<Sparkles className="h-4 w-4" />}>Procesando tu CV</Badge>
          <h1 className="mt-3 text-[28px] font-black leading-none tracking-[-0.035em] min-[390px]:text-[31px]">Analizando tu CV</h1>
          <p className="mt-2 min-h-[40px] px-3 text-[14px] font-medium text-[#626a79]">{loadingMessage}</p>
          <div className="mt-3.5">
            <ProgressRing value={progress} mode="percent" size={140} />
          </div>
        </motion.section>

        <motion.section variants={fadeUp} className="px-5 pt-1">
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
            {hasVacancy ? (
              <>
                <TimelineStep done={activeStep > 3} active={activeStep === 3} number="3" title="Detectando palabras clave">Identificando términos y habilidades importantes.</TimelineStep>
                <TimelineStep done={activeStep > 4} active={activeStep === 4} number="4" title="Comparando con vacante">Midiendo el ajuste con los requisitos del puesto.</TimelineStep>
                <TimelineStep done={activeStep > 5} active={activeStep === 5} number="5" title="Generando versión mejorada" last>Redactando sugerencias y preparando tu CV optimizado.</TimelineStep>
              </>
            ) : (
              <>
                <TimelineStep done={activeStep > 3} active={activeStep === 3} number="3" title="Optimizando formato">Mejorando presentación, secciones y legibilidad.</TimelineStep>
                <TimelineStep done={activeStep > 4} active={activeStep === 4} number="4" title="Generando versión mejorada" last>Redactando sugerencias y preparando tu CV optimizado.</TimelineStep>
              </>
            )}
          </div>

          <div className="mt-3 flex items-center justify-center gap-1.5 border-b border-[#edf0f5] pb-3 text-[14px] font-medium text-[#626a79]">
            <Clock3 className="h-5 w-5 text-[#0068ff]" />
            Esto tarda menos de 1 minuto
          </div>
        </motion.section>

        <motion.section variants={fadeUp} className="px-5 pt-1 pb-4">
          <h2 className="text-[18px] font-black text-left">¿Qué estamos evaluando?</h2>
          <div className="mt-2 grid grid-cols-1 gap-2">
            <EvalCard icon={<FileText className="h-6 w-6" />} title="Formato">Estructura, orden y legibilidad del CV.</EvalCard>
            <EvalCard icon={<UserRound className="h-6 w-6" />} title="Contenido">Relevancia, claridad y palabras clave.</EvalCard>
            <EvalCard icon={<Star className="h-6 w-6" />} title={hasVacancy ? "Ajuste con vacante" : "Impacto"}>{hasVacancy ? "Alineación con los requisitos del puesto." : "Alineación con el puesto y resultados."}</EvalCard>
          </div>
        </motion.section>
      </motion.div>
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
  const reduced = usePrefersReducedMotion();
  const stagger = animStagger(reduced);
  const fadeUp = animFadeUp(reduced);

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
    let statusDesc = "La lectura y extracción de tu documento se realizó correctamente.";
    if (status === "green") {
      statusDesc = "La lectura y extracción del CV fue sumamente clara y completa.";
    } else if (status === "red") {
      statusDesc = "Atención: detectamos múltiples problemas críticos para leer y extraer el texto de tu CV.";
    } else if (status === "yellow") {
      statusDesc = "La lectura fue exitosa, pero detectamos posibles detalles de extracción o formato en el documento.";
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
  const hasVacancyMatch = typeof analysis.vacancyMatchScore === "number";
  const suggestedKeywords = (analysis.suggestedKeywords || []).filter(Boolean).slice(0, 8);

  return (
    <ScreenShell>
      <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-4 pb-2">
        <motion.div variants={fadeUp}>
          <BackHeader onBack={onBack} />
        </motion.div>

        <motion.section variants={fadeUp} className="px-5 pt-1.5 text-center">
          <Badge icon={<Sparkles className="h-4 w-4" />}>Diagnóstico gratuito</Badge>
          <h1 className="mt-3 text-[28px] font-black leading-none tracking-[-0.035em] min-[390px]:text-[31px]">Tu diagnóstico</h1>
          <p className="mt-2 text-[14px] font-medium text-[#626a79]">Detectamos oportunidades de mejora en tu CV.</p>
        </motion.section>

        <motion.section variants={fadeUp} className="px-5 pt-1 pb-1">
          <div className="grid grid-cols-1 items-center gap-3 rounded-[12px] border border-[#e4e9f0] bg-white p-3 text-center shadow-[0_6px_16px_rgba(15,25,55,0.04)]">
            <ProgressRing value={score} mode="score" size={96} />
            <div className="border-t border-[#e8edf4] pt-3 text-left space-y-2">
              <h2 className="text-[17px] font-black leading-tight">
                {analysis.diagnosis?.headline || scoreTitle}
              </h2>
              <p className="text-[13.5px] font-medium leading-5 text-[#626a79]">
                {analysis.diagnosis?.summary || getSubtitleText(analysis.qualityStatus, userMessage)}
              </p>
            </div>
          </div>
          {analysis.diagnosis?.scoreExplanation && (
            <div className="mt-3.5 rounded-[10px] bg-slate-50 border border-slate-100 p-3.5 text-left">
              <h4 className="text-[12px] font-black text-[#475569] uppercase tracking-wider mb-1">Lectura del CV</h4>
              <p className="text-[12.5px] font-medium leading-relaxed text-[#626a79]">
                {analysis.diagnosis.scoreExplanation}
              </p>
            </div>
          )}
          {hasVacancyMatch ? (
            <div className="mt-3 rounded-[10px] border border-[#d7f2e5] bg-[#effcf5] p-3 text-left">
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-[13px] font-black text-[#129853]">
                  <Search className="h-4 w-4" />
                  Coincidencia con vacante
                </span>
                <span className="text-[18px] font-black text-[#129853]">{Math.max(0, Math.min(100, Math.round(analysis.vacancyMatchScore || 0)))}%</span>
              </div>
            </div>
          ) : null}
        </motion.section>

        {note ? (
          <motion.div variants={fadeUp} className="px-5">
            <p className="rounded-[10px] bg-[#fff7e9] px-3.5 py-2.5 text-[13px] font-bold leading-5 text-[#935a12]">{note}</p>
          </motion.div>
        ) : null}

        <motion.section variants={fadeUp} className="px-5">
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
        </motion.section>

        <motion.section variants={fadeUp} className="px-5">
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
        </motion.section>

        {suggestedKeywords.length > 0 ? (
          <motion.section variants={fadeUp} className="px-5">
            <h2 className="mb-2 text-left text-[17px] font-black">Palabras clave sugeridas</h2>
            <div className="flex flex-wrap gap-2">
              {suggestedKeywords.map((keyword) => (
                <span key={keyword} className="inline-flex items-center gap-1.5 rounded-full border border-[#dbe8f8] bg-white px-3 py-1.5 text-[12.5px] font-black text-[#0c55b8] shadow-[0_4px_10px_rgba(15,25,55,0.03)]">
                  <Search className="h-3.5 w-3.5" />
                  {keyword}
                </span>
              ))}
            </div>
          </motion.section>
        ) : null}

        <motion.section variants={fadeUp} className="px-5">
          <SectionTitle number="3" title="Recomendaciones clave" />
          {analysis.diagnosis?.recommendationCards && analysis.diagnosis.recommendationCards.length > 0 ? (
            <div className="grid grid-cols-1 gap-2">
              {analysis.diagnosis.recommendationCards.map((card, index) => {
                const icon = getRecoIcon(index, card.title + " " + card.description);
                return (
                  <RecoCard key={index} icon={icon} title={card.title}>
                    {card.description}
                  </RecoCard>
                );
              })}
            </div>
          ) : (!analysis.recommendations || analysis.recommendations.length === 0) ? (
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
        </motion.section>

        {analysis.extractionWarnings && analysis.extractionWarnings.length > 0 && (
          <motion.div variants={fadeUp} className="px-5">
            <div className="rounded-[10px] border border-[#ffe2bd] bg-[#fffaf4] p-3 text-left">
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
          </motion.div>
        )}

        {analysis.dataIntegrityWarnings && analysis.dataIntegrityWarnings.length > 0 && (
          <motion.div variants={fadeUp} className="px-5">
            <div className="rounded-[10px] border border-[#e4e9f0] bg-[#f8fafc] p-3 text-left">
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
          </motion.div>
        )}

        <motion.section variants={fadeUp} className="px-5">
          <SectionTitle number="4" title="Versión mejorada" />
          <LockedPreview cv={analysis.improvedCV} />
        </motion.section>

        <motion.section variants={fadeUp} className="px-5 pb-6">
          <motion.button
            disabled={!allowDownload}
            className="flex h-[48px] w-full items-center justify-center gap-2.5 rounded-[9px] bg-[#0068ff] text-[15px] font-black text-white shadow-[0_10px_20px_rgba(0,104,255,0.18)] disabled:cursor-not-allowed disabled:bg-[#9fc7ff] disabled:shadow-none"
            onClick={onUnlock}
            whileTap={reduced ? {} : { scale: 0.985 }}
            whileHover={reduced ? {} : { translateY: -1.5 }}
            transition={{ duration: 0.2 }}
          >
            <Lock className="h-5 w-5" />
            Desbloquear mi CV mejorado
          </motion.button>
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
        </motion.section>
      </motion.div>
    </ScreenShell>
  );
}

function PaywallScreen({ 
  onBack, 
  onUnlock,
  isCheckingOut = false,
  checkoutMode = "production",
  error = null
}: { 
  onBack: () => void; 
  onUnlock: () => void;
  isCheckingOut?: boolean;
  checkoutMode?: "mock" | "sandbox" | "production";
  error?: string | null;
}) {
  const reduced = usePrefersReducedMotion();
  const stagger = animStagger(reduced);
  const fadeUp = animFadeUp(reduced);

  return (
    <ScreenShell>
      <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-4">
        <motion.div variants={fadeUp}>
          <BackHeader onBack={onBack} />
        </motion.div>

        {error && (
          <motion.section variants={fadeUp} className="px-5">
            <div className="rounded-[10px] bg-red-50 border border-red-100 p-3.5 text-center text-[13px] font-semibold text-red-600 flex items-center justify-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          </motion.section>
        )}

        <motion.section variants={fadeUp} className="px-5 pt-1.5 text-center">
          <h1 className="text-[28px] font-black leading-[1.1] tracking-[-0.035em] min-[390px]:text-[31px]">
            Desbloquea tu
            <span className="block text-[#0068ff]">CV mejorado</span>
          </h1>
          <p className="mt-2.5 text-[14px] font-medium text-[#626a79]">Conoce lo que ya optimizamos en tu documento.</p>
        </motion.section>

        <motion.section variants={fadeUp} className="px-5 pt-1">
          <div className="grid grid-cols-1 gap-2.5 rounded-[12px] border border-[#e4e9f0] bg-white p-3 shadow-[0_6px_16px_rgba(15,25,55,0.04)]">
            <MiniCvLocked />
            <div className="text-left">
              <h2 className="text-[16px] font-black">Vista final protegida</h2>
              <p className="mt-1.5 text-[13.5px] font-medium leading-5 text-[#626a79]">Tu nueva versión está lista para ayudarte a destacar.</p>
            </div>
          </div>
        </motion.section>

        <motion.section variants={fadeUp} className="px-5">
          <div className="rounded-[12px] border border-[#e4e9f0] bg-white p-3 shadow-[0_6px_16px_rgba(15,25,55,0.04)]">
            <h2 className="text-center text-[18px] font-black mb-1">Tu nueva versión incluye</h2>
            <motion.div variants={stagger} initial="initial" animate="animate" className="divide-y divide-[#edf0f5]">
              <motion.div variants={fadeUp}><FeatureLine icon={<PenLine className="h-5 w-5" />}>Resumen profesional reescrito</FeatureLine></motion.div>
              <motion.div variants={fadeUp}><FeatureLine icon={<Trophy className="h-5 w-5" />}>Logros más claros</FeatureLine></motion.div>
              <motion.div variants={fadeUp}><FeatureLine icon={<FileText className="h-5 w-5" />}>Formato limpio</FeatureLine></motion.div>
              <motion.div variants={fadeUp}><FeatureLine icon={<Layers3 className="h-5 w-5" />}>Secciones reorganizadas</FeatureLine></motion.div>
              <motion.div variants={fadeUp}><FeatureLine icon={<Search className="h-5 w-5" />}>Palabras clave reforzadas</FeatureLine></motion.div>
              <motion.div variants={fadeUp}><FeatureLine icon={<Download className="h-5 w-5" />}>PDF listo para descargar</FeatureLine></motion.div>
            </motion.div>
          </div>
        </motion.section>

        <motion.section variants={fadeUp} className="px-5">
          <div className="rounded-[12px] border border-[#e4e9f0] bg-white p-3 text-center shadow-[0_6px_16px_rgba(15,25,55,0.04)]">
            <div className="flex flex-wrap items-end justify-center gap-x-4 gap-y-1">
              <span className="pb-2 text-[17px] font-bold text-[#6f7682] line-through">$149 MXN</span>
              <span className="text-[42px] font-black leading-none text-[#0068ff]">$49</span>
              <span className="pb-2 text-[15px] font-black text-[#0068ff]">MXN</span>
            </div>
            <p className="mt-0.5 text-[13.5px] font-medium text-[#626a79]">Pago único · Sin suscripciones</p>
            {checkoutMode === "mock" ? (
              <p className="mt-2 inline-flex rounded-full bg-[#edf5ff] px-3 py-1 text-[11.5px] font-black text-[#0c55b8]">
                Modo desarrollo: pago simulado
              </p>
            ) : null}
            <motion.button 
              className="mt-3 flex h-[48px] w-full items-center justify-center gap-2.5 rounded-[9px] bg-[#0068ff] text-[15px] font-black text-white shadow-[0_10px_20px_rgba(0,104,255,0.18)] disabled:opacity-75 disabled:cursor-not-allowed" 
              onClick={onUnlock}
              disabled={isCheckingOut}
              whileTap={reduced ? {} : { scale: 0.985 }}
              whileHover={reduced ? {} : { translateY: -1.5 }}
              transition={{ duration: 0.2 }}
            >
              {isCheckingOut ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white inline" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Conectando...
                </>
              ) : (
                <>
                  {checkoutMode === "mock" ? "Simular pago y continuar" : "Desbloquear mi CV profesional"}
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </motion.button>
          </div>
        </motion.section>

        <motion.section variants={fadeUp} className="px-5 pb-6">
          <div className="grid grid-cols-1 divide-y divide-[#e2e8f0] rounded-[10px] border border-[#e7edf5] bg-white text-center text-[11px] font-black text-[#070b2f]">
            <TrustItem icon={<ShieldCheck className="h-5 w-5" />}>Pago único</TrustItem>
            <TrustItem icon={<Sparkles className="h-5 w-5" />}>Entrega inmediata</TrustItem>
            <TrustItem icon={<Lock className="h-5 w-5" />}>Tus datos están protegidos</TrustItem>
            <TrustItem icon={<FileDown className="h-5 w-5" />}>Descarga PDF + DOCX</TrustItem>
          </div>
        </motion.section>
      </motion.div>
    </ScreenShell>
  );
}

function SuccessScreen({
  analysis,
  downloadToken,
  fileName,
  onDoc,
  onHome,
  onPdf,
  orderStatus = null,
  loadingOrder = false,
  onRefreshOrder,
}: {
  analysis: AnalysisResponse | null;
  downloadToken?: string | null;
  fileName: string;
  onDoc: () => void;
  onHome: () => void;
  onPdf: () => void;
  orderStatus?: string | null;
  loadingOrder?: boolean;
  onRefreshOrder: () => void;
}) {
  const reduced = usePrefersReducedMotion();
  const stagger = animStagger(reduced);
  const fadeUp = animFadeUp(reduced);
  const [copiedLink, setCopiedLink] = useState(false);
  const privateDownloadPath = downloadToken ? `/download/${downloadToken}` : null;
  const privateDownloadUrl = privateDownloadPath && typeof window !== "undefined"
    ? `${window.location.origin}${privateDownloadPath}`
    : privateDownloadPath;

  const copyPrivateLink = async () => {
    if (!privateDownloadUrl) return;
    try {
      await navigator.clipboard.writeText(privateDownloadUrl);
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 1800);
    } catch {
      setCopiedLink(false);
    }
  };

  if (loadingOrder) {
    return (
      <ScreenShell>
        <div className="flex flex-col items-center justify-center py-24 px-5 text-center space-y-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#0068ff] border-t-transparent"></div>
          <h1 className="text-[17px] font-black text-[#070b2f]">Verificando el estado de tu pago...</h1>
          <p className="text-[13.5px] font-medium text-[#626a79] max-w-xs">
            Estamos sincronizando los detalles de tu orden de forma segura. Por favor, no cierres esta página.
          </p>
        </div>
      </ScreenShell>
    );
  }

  if (orderStatus === "pending") {
    return (
      <ScreenShell>
        <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-6">
          <motion.div variants={fadeUp}>
            <header className="flex items-center justify-between gap-2.5 px-5 pt-4">
              <BrandLogo />
              <motion.button 
                className="flex h-[38px] shrink-0 items-center gap-1.5 rounded-[6px] border border-[#cad8e8] bg-white px-2.5 text-[13.5px] font-black text-[#0c55b8]" 
                onClick={onHome}
                whileTap={reduced ? {} : { scale: 0.96 }}
              >
                <Home className="h-4 w-4" />
                Ir al inicio
              </motion.button>
            </header>
          </motion.div>

          <motion.section variants={fadeUp} className="flex flex-col items-center justify-center px-5 pt-4 text-center">
            <div className="grid h-[72px] w-[72px] place-items-center rounded-full bg-amber-50 text-amber-500 border border-amber-200">
              <Clock3 className="h-9 w-9 animate-pulse" />
            </div>
            <h1 className="mt-5 text-[26px] font-black leading-none tracking-[-0.035em]">Esperando confirmación</h1>
            <p className="mt-2.5 text-[13.5px] font-medium text-[#626a79] max-w-sm">
              Mercado Pago está confirmando tu pago. Esto suele tomar de unos segundos a un par de minutos.
            </p>
          </motion.section>

          <motion.section variants={fadeUp} className="px-5">
            <div className="rounded-[12px] border border-amber-100 bg-amber-50/50 p-4 text-center space-y-4">
              <p className="text-[13px] font-semibold text-amber-900 leading-normal">
                ¿Completaste la transacción? Haz clic en el botón de abajo para forzar la actualización del estado.
              </p>
              <motion.button 
                className="flex h-[44px] w-full items-center justify-center gap-2 rounded-[9px] bg-amber-500 hover:bg-amber-600 text-[14px] font-black text-white shadow-md" 
                onClick={onRefreshOrder}
                whileTap={reduced ? {} : { scale: 0.98 }}
              >
                <CheckCircle2 className="h-4 w-4" />
                Actualizar estado del pago
              </motion.button>
            </div>
          </motion.section>
        </motion.div>
      </ScreenShell>
    );
  }

  if (!analysis) {
    return (
      <ScreenShell>
        <div className="flex flex-col items-center justify-center py-20 px-5 text-center space-y-4">
          <p className="text-[14px] font-black text-red-600">No se encontraron datos del CV.</p>
          <motion.button 
            className="flex h-[40px] items-center gap-1.5 rounded-[6px] border border-[#cad8e8] bg-white px-4 text-[13.5px] font-black text-[#0c55b8]" 
            onClick={onHome}
          >
            Volver a intentar
          </motion.button>
        </div>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell>
      <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-4">
        <motion.div variants={fadeUp}>
          <header className="flex items-center justify-between gap-2.5 px-5 pt-4">
            <BrandLogo />
            <motion.button 
              className="flex h-[38px] shrink-0 items-center gap-1.5 rounded-[6px] border border-[#cad8e8] bg-white px-2.5 text-[13.5px] font-black text-[#0c55b8]" 
              onClick={onHome}
              whileTap={reduced ? {} : { scale: 0.96 }}
            >
              <Home className="h-4 w-4" />
              Ir al inicio
            </motion.button>
          </header>
        </motion.div>

        <motion.section variants={fadeUp} className="px-5 pt-1.5 text-center flex flex-col items-center">
          {/* Pulsing check circle container */}
          <motion.div 
            className="grid h-[72px] w-[72px] place-items-center rounded-full bg-[#e4f9ef] text-[#0fbd68]"
            initial={reduced ? {} : { scale: 0.3, opacity: 0 }}
            animate={reduced ? {} : { 
              scale: 1, 
              opacity: 1,
              boxShadow: [
                "0 0 0 9px rgba(228,249,239,0.45)",
                "0 0 0 16px rgba(228,249,239,0)",
                "0 0 0 9px rgba(228,249,239,0.45)"
              ]
            }}
            transition={reduced ? {} : { 
              scale: { type: "spring", stiffness: 200, damping: 15 },
              opacity: { duration: 0.2 },
              boxShadow: { repeat: Infinity, duration: 2.2, ease: "easeInOut" }
            }}
          >
            <motion.span
              initial={reduced ? {} : { scale: 0 }}
              animate={reduced ? {} : { scale: 1 }}
              transition={reduced ? {} : { delay: 0.15, type: "spring", stiffness: 300, damping: 12 }}
              className="flex items-center justify-center"
            >
              <Check className="h-9 w-9" strokeWidth={5} />
            </motion.span>
          </motion.div>
          <h1 className="mt-5 text-[28px] font-black leading-none tracking-[-0.035em] min-[390px]:text-[31px]">¡Tu CV está listo!</h1>
          <p className="mt-2.5 text-[14px] font-medium text-[#626a79]">Hemos generado tu versión mejorada.</p>
        </motion.section>

        <motion.section variants={fadeUp} className="px-5 pt-1 pb-4">
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
            <motion.button 
              className="flex h-[48px] w-full items-center justify-center gap-2.5 rounded-[9px] bg-[#0068ff] text-[15px] font-black text-white shadow-[0_10px_20px_rgba(0,104,255,0.18)] disabled:opacity-50 disabled:cursor-not-allowed" 
              onClick={onPdf} 
              disabled={!analysis.deliveryDecision.allowDownload}
              whileTap={reduced ? {} : { scale: 0.985 }}
              whileHover={reduced ? {} : { translateY: -1.5 }}
              transition={{ duration: 0.2 }}
            >
              <Download className="h-5 w-5" />
              Descargar PDF
            </motion.button>
            <motion.button 
              className="flex h-[46px] w-full items-center justify-center gap-2.5 rounded-[9px] border border-[#0068ff] bg-white text-[15px] font-black text-[#0068ff]" 
              onClick={onDoc}
              whileTap={reduced ? {} : { scale: 0.985 }}
              whileHover={reduced ? {} : { translateY: -1.5 }}
              transition={{ duration: 0.2 }}
            >
              <FileDown className="h-5 w-5" />
              Descargar DOCX
            </motion.button>
          </div>

          {privateDownloadPath ? (
            <motion.div variants={fadeUp} className="mt-4 rounded-[12px] border border-[#e4e9f0] bg-white p-3 text-left shadow-[0_6px_16px_rgba(15,25,55,0.04)]">
              <div className="flex items-start gap-2.5">
                <div className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-full bg-[#edf5ff] text-[#0068ff]">
                  <Copy className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-[15px] font-black">Enlace privado de descarga</h2>
                  <p className="mt-0.5 text-[12.5px] font-medium leading-4 text-[#626a79]">Guárdalo para volver a descargar tu CV después.</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <code className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap rounded-[8px] bg-[#f4f7fb] px-3 py-2 text-[12px] font-bold text-[#4b5563]">
                  {privateDownloadPath}
                </code>
                <button type="button" onClick={copyPrivateLink} className="shrink-0 rounded-[8px] border border-[#0068ff] px-3 py-2 text-[12px] font-black text-[#0068ff]">
                  {copiedLink ? "Copiado" : "Copiar enlace"}
                </button>
              </div>
            </motion.div>
          ) : null}

          <h2 className="mt-5 text-left text-[18px] font-black">Qué mejoramos</h2>
          <div className="mt-3 grid grid-cols-1 gap-2.5">
            {analysis.diagnosis?.improvementsMade && analysis.diagnosis.improvementsMade.length > 0 ? (
              analysis.diagnosis.improvementsMade.map((imp, index) => {
                const icon = getRecoIcon(index, imp.title + " " + imp.description);
                const tones: ("blue" | "green" | "purple")[] = ["blue", "green", "purple"];
                const tone = tones[index % tones.length];
                return (
                  <ImprovedCard 
                    key={index} 
                    icon={icon} 
                    title={imp.title} 
                    tone={tone}
                  >
                    {imp.description}
                  </ImprovedCard>
                );
              })
            ) : (
              <>
                <ImprovedCard icon={<FileText className="h-7 w-7" />} title="Resumen optimizado">Reescribimos tu perfil para hacerlo más claro, impactante y relevante.</ImprovedCard>
                <ImprovedCard icon={<BarChart3 className="h-7 w-7" />} title="Logros reforzados" tone="green">Destacamos tus resultados con métricas y verbos de alto impacto.</ImprovedCard>
                <ImprovedCard icon={<Layers3 className="h-7 w-7" />} title="Formato limpio" tone="purple">Diseño profesional, escaneable y optimizado para los ATS.</ImprovedCard>
              </>
            )}
          </div>

          <ProtectedNote className="mt-5" />
          <p className="sr-only">Archivo original: {fileName}</p>
        </motion.section>
      </motion.div>
    </ScreenShell>
  );
}

function ScreenShell({ children }: { children: ReactNode }) {
  const reduced = usePrefersReducedMotion();
  return (
    <motion.div
      initial={{ opacity: 0, y: reduced ? 0 : 14, filter: reduced ? "none" : "blur(6px)" }}
      animate={{ opacity: 1, y: 0, filter: "none" }}
      transition={{ duration: reduced ? 0.15 : 0.38, ease: [0.22, 1, 0.36, 1] }}
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
  const reduced = usePrefersReducedMotion();
  const [animatedValue, setAnimatedValue] = useState(0);

  useEffect(() => {
    if (mode === "percent" || reduced) {
      const animationFrameId = requestAnimationFrame(() => setAnimatedValue(value));
      return () => cancelAnimationFrame(animationFrameId);
    }
    let start = 0;
    const end = value;
    if (start === end) {
      const animationFrameId = requestAnimationFrame(() => setAnimatedValue(value));
      return () => cancelAnimationFrame(animationFrameId);
    }
    const duration = 1200; // 1.2 seconds for full count up
    const startTime = performance.now();
    
    let animationFrameId: number;
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out quad: f(t) = t * (2 - t)
      const easeProgress = progress * (2 - progress);
      setAnimatedValue(Math.round(start + easeProgress * (end - start)));
      
      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      }
    };
    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [value, mode, reduced]);

  const inner = size - 20;
  const numSize = size < 110 ? "text-[28px]" : mode === "percent" ? "text-[36px]" : "text-[32px]";
  const pctSize = size < 110 ? "text-[16px]" : "text-[19px]";
  const lblSize = size < 110 ? "text-[12px] mt-0.5" : "text-[14px] mt-1";
  return (
    <div className="mx-auto grid place-items-center rounded-full transition-all duration-300" style={{ width: size, height: size, background: `conic-gradient(${blue} 0deg ${animatedValue * 3.6}deg, #e8f1ff ${animatedValue * 3.6}deg 360deg)` }}>
      <div className="grid place-items-center rounded-full bg-white" style={{ width: inner, height: inner }}>
        <div className="text-center select-none">
          <p className={`${numSize} font-black leading-none tracking-[-0.04em]`}>
            {animatedValue}
            {mode === "percent" ? <span className={pctSize}>%</span> : null}
          </p>
          <p className={`${lblSize} font-medium text-[#626a79]`}>
            {mode === "percent" ? (animatedValue === 100 ? "¡Listo!" : "Analizando...") : "/100"}
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
            <span className="pb-1 text-[14.5px] font-bold text-[#6f7682] line-through">$149 MXN</span>
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

function TimelineStep({ active, children, done, last, number, title }: { active?: boolean; children: ReactNode; done?: boolean; last?: boolean; number: string; title: string }) {
  const reduced = usePrefersReducedMotion();
  return (
    <motion.div 
      className="grid grid-cols-[28px_1fr] gap-2.5 pb-4 last:pb-0"
      animate={active && !reduced ? { x: 3, scale: 1.01 } : { x: 0, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="relative flex justify-center">
        {!last ? <span className="absolute top-7 h-full w-px bg-[#d6f2e5]" /> : null}
        <motion.span 
          className={`relative z-10 grid h-7 w-7 place-items-center rounded-full text-[13px] font-black ${done ? "bg-[#9ff0c8] text-[#0f9f57]" : active ? "border-[3px] border-[#0068ff] bg-white text-[#0068ff]" : "bg-[#eef2f7] text-[#6f7682]"}`}
          animate={active && !reduced ? { scale: [1, 1.08, 1] } : { scale: 1 }}
          transition={{ repeat: active ? Infinity : 0, duration: 1.5, ease: "easeInOut" }}
        >
          {done ? (
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 15 }}>
              <Check className="h-4 w-4" strokeWidth={4} />
            </motion.span>
          ) : active ? (
            <motion.span className="h-2 w-2 rounded-full bg-[#0068ff]" animate={{ scale: [1, 1.4, 1] }} transition={{ repeat: Infinity, duration: 1.2 }} />
          ) : number}
        </motion.span>
      </div>
      <div>
        <h3 className={`text-[15px] font-black leading-5 min-[390px]:text-[16px] transition-colors duration-300 ${active ? "text-[#0068ff]" : "text-[#070b2f]"}`}>{number}.&nbsp;&nbsp;{title}</h3>
        <p className="mt-0.5 text-[12.5px] font-medium leading-5 text-[#626a79]">{children}</p>
      </div>
    </motion.div>
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
  const reduced = usePrefersReducedMotion();
  return (
    <motion.div 
      className="rounded-[10px] border border-[#e4e9f0] bg-white p-3 shadow-[0_5px_12px_rgba(15,25,55,0.04)] text-left cursor-pointer transition-colors duration-200 hover:border-[#0068ff]/30"
      whileTap={reduced ? {} : { scale: 0.98 }}
      whileHover={reduced ? {} : { translateY: -1.5, boxShadow: "0 8px 18px rgba(15,25,55,0.06)" }}
    >
      <div className="flex items-start gap-2.5">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#edf5ff] text-[#0068ff]">{icon}</div>
        <div className="min-w-0 flex-1">
          <h3 className="text-[13.5px] font-black leading-5 text-[#070b2f]">{title}</h3>
          <p className="mt-1 text-[12px] font-medium leading-4 text-[#626a79]">{children}</p>
        </div>
        <ChevronRight className="h-4 w-4 text-[#9ba4b2] shrink-0 self-center" />
      </div>
    </motion.div>
  );
}

function LockedPreview({ cv }: { cv: ImprovedCV }) {
  const reduced = usePrefersReducedMotion();
  const firstExp = cv?.experience && cv.experience[0];
  return (
    <div className="relative grid grid-cols-1 overflow-hidden rounded-[12px] border border-[#d9e4f1] bg-white shadow-[0_6px_16px_rgba(15,25,55,0.04)]">
      <div className="p-3 pb-2 text-[12.5px] font-medium leading-5 text-[#626a79] border-b border-[#f1f5f9]">
        Esta es una vista previa de tu CV optimizado. Desbloquea la versión completa para conocer todos los detalles y descargarla.
      </div>
      
      {/* Partially Blurred Real CV Content */}
      <div className="relative select-none p-4 text-left blur-[2px] opacity-75 overflow-hidden">
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

        {/* Shimmer overlay over blurred text */}
        {!reduced && (
          <motion.div 
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
            animate={{ x: ["-100%", "100%"] }}
            transition={{ repeat: Infinity, duration: 2.2, ease: "linear" }}
          />
        )}
      </div>
      
      {/* Centered Lock Icon */}
      <div className="absolute inset-0 bg-white/10 backdrop-blur-[1px] flex items-center justify-center">
        <motion.div 
          className="grid h-12 w-12 place-items-center rounded-full bg-white text-[#0068ff] shadow-[0_12px_32px_rgba(0,104,255,0.22)] border border-[#e2e8f0]"
          animate={reduced ? {} : { scale: [1, 1.08, 1] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        >
          <Lock className="h-6 w-6" />
        </motion.div>
      </div>
    </div>
  );
}

function MiniCvLocked() {
  const reduced = usePrefersReducedMotion();
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

      {/* Shimmer Overlay */}
      {!reduced && (
        <motion.div 
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
          animate={{ x: ["-100%", "100%"] }}
          transition={{ repeat: Infinity, duration: 1.8, ease: "linear" }}
        />
      )}
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
