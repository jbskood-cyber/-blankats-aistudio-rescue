"use client";

import Image from "next/image";
import type { ChangeEvent, DragEvent, ReactNode } from "react";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Download,
  FileText,
  FileUp,
  Loader2,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TextCursorInput,
  XCircle,
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

const loadingSteps = [
  "Extrayendo contenido original",
  "Validando calidad de lectura",
  "Evaluando estructura y datos",
  "Preparando diagnostico",
  "Construyendo la version mejorada",
];

const safeHighlights = [
  "Estructura mas clara",
  "Revision de integridad",
  "Lista para revisar",
];

const statusCopy: Record<
  QualityStatus,
  { title: string; tone: string; icon: ReactNode; label: string }
> = {
  green: {
    title: "Analisis confiable",
    label: "Verde",
    tone: "border-emerald-200 bg-emerald-50 text-emerald-800",
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
  yellow: {
    title: "Revisar antes de usar",
    label: "Amarillo",
    tone: "border-amber-200 bg-amber-50 text-amber-900",
    icon: <ShieldAlert className="h-4 w-4" />,
  },
  red: {
    title: "Entrada insuficiente",
    label: "Rojo",
    tone: "border-rose-200 bg-rose-50 text-rose-800",
    icon: <XCircle className="h-4 w-4" />,
  },
};

const processingModeLabel: Record<ProcessingMode, string> = {
  PRESERVE_AND_POLISH: "Conservar y pulir",
  RESTRUCTURE_AND_IMPROVE: "Reestructurar y mejorar",
  REVIEW_REQUIRED: "Revision requerida",
};

const recommendedActionLabel: Record<RecommendedAction, string> = {
  download_ready: "Descarga lista",
  review_before_download: "Revisar antes de descargar",
  request_better_input: "Pedir mejor entrada",
};

type RawRecord = Record<string, unknown>;

function asRecord(value: unknown): RawRecord {
  return value && typeof value === "object" ? (value as RawRecord) : {};
}

function sanitizeImprovedCV(cv: unknown): ImprovedCV {
  const rawCV = asRecord(cv);

  const cleanText = (value: unknown): string => {
    let text = String(value ?? "").trim();
    text = text.replace(/\[[^\]]*\]/g, "");
    text = text.replace(/pendiente/gi, "");
    text = text.replace(/agregar aqui/gi, "");
    text = text.replace(/\bn\/a\b/gi, "");
    text = text.replace(/placeholder/gi, "");
    return text.replace(/\s+/g, " ").trim();
  };

  const sanitizeBullets = (
    bullets: unknown,
    descriptionFallback?: string,
  ): string[] => {
    let rawList: string[] = [];

    if (Array.isArray(bullets) && bullets.length > 0) {
      rawList = bullets.map((bullet) => String(bullet));
    } else if (descriptionFallback) {
      rawList = descriptionFallback
        .replace(/\.-/g, "\n")
        .replace(/\s[-*]\s/g, "\n")
        .split("\n");
    }

    return rawList
      .map((line) => cleanText(line).replace(/^[-*]\s?/, "").trim())
      .filter((line) => line.length > 0);
  };

  const experience = Array.isArray(rawCV.experience)
    ? rawCV.experience.map((entry) => {
        const item = asRecord(entry);
        return {
          company: cleanText(item.company),
          role: cleanText(item.role),
          period: cleanText(item.period),
          bullets: sanitizeBullets(
            item.bullets,
            typeof item.description === "string" ? item.description : undefined,
          ),
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

  const skills = Array.isArray(rawCV.skills)
    ? rawCV.skills.map(cleanText).filter(Boolean)
    : [];

  const projects = Array.isArray(rawCV.projects)
    ? rawCV.projects.map((entry) => {
        const item = asRecord(entry);
        return {
          name: cleanText(item.name),
          bullets: sanitizeBullets(
            item.bullets,
            typeof item.description === "string" ? item.description : undefined,
          ),
          period: item.period ? cleanText(item.period) : undefined,
        };
      })
    : [];

  const certifications = Array.isArray(rawCV.certifications)
    ? rawCV.certifications.map(cleanText).filter(Boolean)
    : undefined;

  return {
    name: cleanText(rawCV.name),
    title: cleanText(rawCV.title),
    contact: cleanText(rawCV.contact),
    summary: cleanText(rawCV.summary),
    experience,
    education,
    skills,
    projects: projects.length > 0 ? projects : undefined,
    certifications,
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

  const canAnalyze = useMemo(
    () => Boolean(file || pastedText.trim()),
    [file, pastedText],
  );

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
    if (droppedFile) {
      acceptFile(droppedFile);
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      acceptFile(selectedFile);
    }
  };

  const acceptFile = (selectedFile: File) => {
    if (selectedFile.type !== "application/pdf") {
      setError("Sube un archivo PDF para mantener el analisis en el formato correcto.");
      return;
    }

    setFile(selectedFile);
    setUseTextMode(false);
    setError(null);
  };

  const fileToBase64 = (selectedFile: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
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
  };

  const handleAnalyze = async () => {
    if (!canAnalyze) {
      setError("Sube tu CV en PDF o pega el texto para iniciar el analisis.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setLoadingStep(0);

    const timer = window.setInterval(() => {
      setLoadingStep((step) => Math.min(step + 1, loadingSteps.length - 1));
    }, 2600);

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
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(payload.error || "No se pudo analizar el CV.");
      }

      const data = (await response.json()) as AnalysisResponse;
      data.improvedCV = sanitizeImprovedCV(data.improvedCV);
      setResult(data);
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "No se pudo completar el analisis. Intenta de nuevo.";
      setError(message);
    } finally {
      window.clearInterval(timer);
      setIsLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!result) return;

    if (!result.deliveryDecision.allowDownload) {
      window.alert(
        result.deliveryDecision.userMessage ||
          "La descarga no esta permitida para este documento.",
      );
      return;
    }

    if (result.deliveryDecision.showWarningBeforeDownload) {
      const confirmDownload = window.confirm(
        result.deliveryDecision.userMessage ||
          "Detectamos posibles detalles de lectura. Revisa el resultado antes de descargar.",
      );
      if (!confirmDownload) return;
    }

    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF("p", "pt", "a4");
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 50;
      const contentWidth = pageWidth - margin * 2;
      let currentY = 52;

      const ensureSpace = (height: number) => {
        if (currentY + height > pageHeight - margin) {
          doc.addPage();
          currentY = margin;
        }
      };

      const addText = (
        text: string,
        size: number,
        style: "normal" | "bold" | "italic" = "normal",
        spacing = 14,
      ) => {
        doc.setFont("helvetica", style);
        doc.setFontSize(size);
        doc.setTextColor(31, 41, 55);
        const lines = doc.splitTextToSize(text, contentWidth);
        ensureSpace(lines.length * spacing);
        lines.forEach((line: string) => {
          doc.text(line, margin, currentY);
          currentY += spacing;
        });
      };

      const addSectionTitle = (title: string) => {
        ensureSpace(34);
        currentY += 9;
        doc.setDrawColor(209, 213, 219);
        doc.line(margin, currentY, pageWidth - margin, currentY);
        currentY += 18;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10.5);
        doc.setTextColor(15, 23, 42);
        doc.text(title.toUpperCase(), margin, currentY);
        currentY += 17;
      };

      const addBullets = (items: string[]) => {
        items.forEach((item) => {
          const bulletLines = doc.splitTextToSize(item, contentWidth - 18);
          ensureSpace(bulletLines.length * 12.5);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9);
          doc.setTextColor(55, 65, 81);
          doc.text("-", margin + 8, currentY);
          bulletLines.forEach((line: string) => {
            doc.text(line, margin + 18, currentY);
            currentY += 12.5;
          });
        });
      };

      const cv = result.improvedCV;

      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.text((cv.name || "CV").toUpperCase(), margin, currentY);
      currentY += 24;

      if (cv.title) addText(cv.title.toUpperCase(), 11, "bold", 15);
      if (cv.contact) addText(cv.contact, 9, "normal", 13);

      if (cv.summary) {
        addSectionTitle("Resumen profesional");
        addText(cv.summary, 9.5, "normal", 13.5);
      }

      if (cv.experience.length) {
        addSectionTitle("Experiencia laboral");
        cv.experience.forEach((item) => {
          ensureSpace(42);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(10);
          doc.setTextColor(15, 23, 42);
          doc.text(`${item.role} - ${item.company}`, margin, currentY);
          doc.setFont("helvetica", "italic");
          doc.setFontSize(9);
          doc.setTextColor(75, 85, 99);
          doc.text(
            item.period || "",
            pageWidth - margin - doc.getTextWidth(item.period || ""),
            currentY,
          );
          currentY += 15;
          addBullets(item.bullets);
          currentY += 7;
        });
      }

      if (cv.education.length) {
        addSectionTitle("Educacion");
        cv.education.forEach((item) => {
          ensureSpace(30);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(10);
          doc.setTextColor(15, 23, 42);
          doc.text(item.degree, margin, currentY);
          doc.setFont("helvetica", "italic");
          doc.setFontSize(9);
          doc.setTextColor(75, 85, 99);
          doc.text(
            item.period || "",
            pageWidth - margin - doc.getTextWidth(item.period || ""),
            currentY,
          );
          currentY += 13;
          addText(item.institution, 9, "normal", 12);
          if (item.description) addText(item.description, 9, "italic", 12);
          currentY += 4;
        });
      }

      if (cv.skills.length) {
        addSectionTitle("Habilidades");
        addText(cv.skills.join(", "), 9, "normal", 13);
      }

      if (cv.projects?.length) {
        addSectionTitle("Proyectos");
        cv.projects.forEach((item) => {
          addText(`${item.name}${item.period ? ` - ${item.period}` : ""}`, 10, "bold", 13);
          addBullets(item.bullets);
          currentY += 4;
        });
      }

      if (cv.certifications?.length) {
        addSectionTitle("Certificaciones");
        cv.certifications.forEach((item) => addText(`- ${item}`, 9, "normal", 12.5));
      }

      const fileName = (cv.name || "BlankATS_CV").replace(/\s+/g, "_");
      doc.save(`CV_BlankATS_${fileName}.pdf`);
    } catch {
      window.alert("Hubo un error al generar el PDF. Intenta de nuevo.");
    }
  };

  const handleReset = () => {
    setFile(null);
    setPastedText("");
    setResult(null);
    setError(null);
    setUseTextMode(false);
  };

  return (
    <div className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,#eaf3ff_0,#f8fafc_34rem,#ffffff_70rem)] text-slate-950">
      <AppHeader />
      <main className="mx-auto flex w-full max-w-7xl flex-col px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        <AnimatePresence mode="wait">
          {!result ? (
            <motion.section
              key="intake"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -18 }}
              transition={{ duration: 0.34, ease: "easeOut" }}
              className="grid gap-8 lg:grid-cols-[0.88fr_1.12fr] lg:items-start"
            >
              <HeroPanel />
              <div className="space-y-5">
                <IntakeCard
                  canAnalyze={canAnalyze}
                  dragActive={dragActive}
                  error={error}
                  file={file}
                  isLoading={isLoading}
                  pastedText={pastedText}
                  useTextMode={useTextMode}
                  onAnalyze={handleAnalyze}
                  onDrag={handleDrag}
                  onDrop={handleDrop}
                  onFileChange={handleFileChange}
                  onTextChange={setPastedText}
                  onUseTextMode={setUseTextMode}
                />
                {isLoading ? <LoadingState activeStep={loadingStep} /> : null}
              </div>
            </motion.section>
          ) : (
            <ResultsView
              key="results"
              result={result}
              onDownload={handleDownloadPDF}
              onReset={handleReset}
            />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function AppHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/70 bg-white/78 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Image
            src="/blankats-wordmark.png"
            alt="BlankATS"
            width={820}
            height={240}
            priority
            className="h-10 w-auto max-w-[210px] object-contain sm:h-12"
          />
          <p className="hidden text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 sm:block">
            CV clarity studio
          </p>
        </div>
        <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm sm:flex">
          <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
          Motor IA Studio preservado
        </div>
      </div>
    </header>
  );
}

function HeroPanel() {
  return (
    <section className="pt-5 lg:pt-12">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.4 }}
        className="max-w-xl"
      >
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/80 px-3 py-1.5 text-xs font-bold text-blue-700 shadow-sm">
          <Sparkles className="h-3.5 w-3.5" />
          Revision inteligente para CVs profesionales
        </div>
        <h1 className="text-balance text-4xl font-black leading-[0.98] tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
          Convierte tu CV en una lectura clara y confiable.
        </h1>
        <p className="mt-5 max-w-lg text-base leading-7 text-slate-600 sm:text-lg">
          BlankATS analiza tu PDF o texto, valida la calidad de lectura y prepara
          una version mas ordenada, profesional y facil de revisar por reclutadores
          y procesos digitales.
        </p>
        <div className="mt-7 grid gap-3 sm:grid-cols-3">
          {safeHighlights.map((item) => (
            <div
              key={item}
              className="rounded-lg border border-white bg-white/72 px-4 py-3 text-sm font-bold text-slate-700 shadow-sm"
            >
              {item}
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}

function IntakeCard({
  canAnalyze,
  dragActive,
  error,
  file,
  isLoading,
  pastedText,
  useTextMode,
  onAnalyze,
  onDrag,
  onDrop,
  onFileChange,
  onTextChange,
  onUseTextMode,
}: {
  canAnalyze: boolean;
  dragActive: boolean;
  error: string | null;
  file: File | null;
  isLoading: boolean;
  pastedText: string;
  useTextMode: boolean;
  onAnalyze: () => void;
  onDrag: (event: DragEvent<HTMLDivElement>) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onTextChange: (value: string) => void;
  onUseTextMode: (value: boolean) => void;
}) {
  return (
    <section className="rounded-lg border border-white bg-white/88 p-4 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur sm:p-6 lg:mt-8">
      <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-2">
        <div className="grid grid-cols-2 gap-2">
          <ModeButton
            active={!useTextMode}
            icon={<FileUp className="h-4 w-4" />}
            label="PDF"
            onClick={() => onUseTextMode(false)}
          />
          <ModeButton
            active={useTextMode}
            icon={<TextCursorInput className="h-4 w-4" />}
            label="Texto"
            onClick={() => onUseTextMode(true)}
          />
        </div>
      </div>

      <div className="mt-5">
        {useTextMode ? (
          <TextInputArea value={pastedText} onChange={onTextChange} />
        ) : (
          <UploadDropzone
            dragActive={dragActive}
            file={file}
            onDrag={onDrag}
            onDrop={onDrop}
            onFileChange={onFileChange}
          />
        )}
      </div>

      {error ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 flex gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-800"
        >
          <AlertCircle className="h-5 w-5 shrink-0" />
          {error}
        </motion.div>
      ) : null}

      <button
        type="button"
        onClick={onAnalyze}
        disabled={!canAnalyze || isLoading}
        className="mt-5 flex min-h-14 w-full items-center justify-center gap-3 rounded-lg bg-slate-950 px-5 py-4 text-sm font-black text-white shadow-[0_18px_40px_rgba(15,23,42,0.20)] transition duration-200 hover:-translate-y-0.5 hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Analizando CV
          </>
        ) : (
          <>
            Analizar mi CV
            <ArrowRight className="h-5 w-5" />
          </>
        )}
      </button>
    </section>
  );
}

function ModeButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-11 items-center justify-center gap-2 rounded-lg text-sm font-black transition ${
        active
          ? "bg-white text-slate-950 shadow-sm ring-1 ring-slate-200"
          : "text-slate-500 hover:bg-white/70 hover:text-slate-800"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function UploadDropzone({
  dragActive,
  file,
  onDrag,
  onDrop,
  onFileChange,
}: {
  dragActive: boolean;
  file: File | null;
  onDrag: (event: DragEvent<HTMLDivElement>) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div
      onDragEnter={onDrag}
      onDragOver={onDrag}
      onDragLeave={onDrag}
      onDrop={onDrop}
      className={`relative overflow-hidden rounded-lg border border-dashed p-7 text-center transition sm:p-9 ${
        dragActive
          ? "border-blue-400 bg-blue-50"
          : "border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/35"
      }`}
    >
      <input
        type="file"
        accept="application/pdf"
        onChange={onFileChange}
        className="absolute inset-0 cursor-pointer opacity-0"
        aria-label="Subir CV en PDF"
      />
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-lg bg-slate-950 text-white shadow-lg">
        <FileUp className="h-8 w-8" />
      </div>
      <h2 className="mt-6 text-xl font-black text-slate-950">
        {file ? file.name : "Sube tu CV en PDF"}
      </h2>
      <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-500">
        {file
          ? "Archivo listo para analizar. Puedes reemplazarlo tocando esta zona."
          : "Arrastra tu archivo aqui o toca para seleccionarlo desde tu dispositivo."}
      </p>
      <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-slate-400">
        PDF recomendado
      </p>
    </div>
  );
}

function TextInputArea({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder="Pega aqui el texto de tu CV si el PDF no se lee bien o quieres revisar contenido copiado."
      className="min-h-72 w-full resize-none rounded-lg border border-slate-200 bg-white p-5 text-sm leading-7 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
    />
  );
}

function LoadingState({ activeStep }: { activeStep: number }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-5 rounded-lg border border-blue-100 bg-blue-50/70 p-4"
    >
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-blue-600 text-white">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
        <div>
          <p className="text-sm font-black text-slate-950">
            {loadingSteps[activeStep]}
          </p>
          <p className="text-xs font-medium text-slate-500">
            Validando lectura, datos y estructura del CV.
          </p>
        </div>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white">
        <motion.div
          className="h-full rounded-full bg-blue-600"
          initial={{ width: "16%" }}
          animate={{ width: `${((activeStep + 1) / loadingSteps.length) * 100}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>
    </motion.section>
  );
}

function ResultsView({
  result,
  onDownload,
  onReset,
}: {
  result: AnalysisResponse;
  onDownload: () => void;
  onReset: () => void;
}) {
  const status = statusCopy[result.qualityStatus];

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -18 }}
      transition={{ duration: 0.34, ease: "easeOut" }}
      className="space-y-6"
    >
      <div className="rounded-lg border border-white bg-white/88 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black ${status.tone}`}>
              {status.icon}
              {status.title}
            </div>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950">
              Diagnostico del CV
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              {result.deliveryDecision.userMessage}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onReset}
              className="flex min-h-12 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-5 text-sm font-black text-slate-800 transition hover:-translate-y-0.5 hover:border-slate-300"
            >
              <RefreshCw className="h-4 w-4" />
              Analizar otro
            </button>
            <button
              type="button"
              onClick={onDownload}
              disabled={!result.deliveryDecision.allowDownload}
              className="flex min-h-12 items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-black text-white shadow-[0_14px_30px_rgba(37,99,235,0.24)] transition hover:-translate-y-0.5 hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
            >
              <Download className="h-4 w-4" />
              Descargar PDF
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
        <div className="space-y-6">
          <QualityPanel result={result} />
          <InsightList title="Problemas detectados" items={result.problems} />
          <InsightList title="Secciones faltantes" items={result.missingSections} />
          <InsightList title="Recomendaciones" items={result.recommendations} />
          <InsightList title="Advertencias de lectura" items={result.extractionWarnings} tone="amber" />
          <InsightList title="Advertencias de datos" items={result.dataIntegrityWarnings} tone="rose" />
        </div>
        <CVPreview cv={result.improvedCV} />
      </div>
    </motion.section>
  );
}

function QualityPanel({ result }: { result: AnalysisResponse }) {
  const status = statusCopy[result.qualityStatus];
  const score = Math.max(0, Math.min(100, Number(result.score) || 0));

  return (
    <section className="rounded-lg border border-white bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
            Score
          </p>
          <p className="mt-2 text-5xl font-black tracking-tight text-slate-950">
            {score}
          </p>
        </div>
        <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black ${status.tone}`}>
          {status.icon}
          {status.label}
        </div>
      </div>
      <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
        <motion.div
          className="h-full rounded-full bg-blue-600"
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        />
      </div>
      <div className="mt-5 grid gap-3 text-sm">
        <MetaRow label="Modo" value={processingModeLabel[result.processingMode]} />
        <MetaRow label="Accion" value={recommendedActionLabel[result.recommendedAction]} />
        <MetaRow
          label="Descarga"
          value={result.deliveryDecision.allowDownload ? "Permitida" : "Bloqueada"}
        />
      </div>
      {result.qualityStatus === "yellow" ? (
        <WarningBox>
          La descarga esta permitida, pero se mostrara una confirmacion antes de generar el PDF.
        </WarningBox>
      ) : null}
      {result.qualityStatus === "red" ? (
        <WarningBox tone="rose">{result.deliveryDecision.userMessage}</WarningBox>
      ) : null}
    </section>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-3">
      <span className="font-semibold text-slate-500">{label}</span>
      <span className="text-right font-black text-slate-900">{value}</span>
    </div>
  );
}

function WarningBox({
  children,
  tone = "amber",
}: {
  children: ReactNode;
  tone?: "amber" | "rose";
}) {
  const classes =
    tone === "rose"
      ? "border-rose-200 bg-rose-50 text-rose-800"
      : "border-amber-200 bg-amber-50 text-amber-900";

  return (
    <div className={`mt-5 rounded-lg border p-4 text-sm font-semibold leading-6 ${classes}`}>
      {children}
    </div>
  );
}

function InsightList({
  title,
  items,
  tone = "slate",
}: {
  title: string;
  items: string[];
  tone?: "slate" | "amber" | "rose";
}) {
  const toneClass =
    tone === "amber"
      ? "bg-amber-500"
      : tone === "rose"
        ? "bg-rose-500"
        : "bg-blue-600";

  return (
    <section className="rounded-lg border border-white bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <span className={`h-2.5 w-2.5 rounded-full ${toneClass}`} />
        <h3 className="text-sm font-black uppercase tracking-[0.14em] text-slate-950">
          {title}
        </h3>
      </div>
      {items?.length ? (
        <ul className="mt-4 space-y-3">
          {items.map((item) => (
            <li key={item} className="flex gap-3 text-sm leading-6 text-slate-600">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300" />
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm font-medium text-slate-400">
          Sin observaciones relevantes.
        </p>
      )}
    </section>
  );
}

function CVPreview({ cv }: { cv: ImprovedCV }) {
  return (
    <article className="overflow-hidden rounded-lg border border-white bg-white shadow-[0_24px_80px_rgba(15,23,42,0.10)]">
      <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-950 px-5 py-4 text-white sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm font-black">
          <FileText className="h-4 w-4 text-blue-300" />
          Preview del CV mejorado
        </div>
        <p className="text-xs font-semibold text-slate-300">
          Formato limpio, una columna, facil de revisar
        </p>
      </div>
      <div className="max-h-[760px] overflow-y-auto bg-slate-100 p-3 sm:p-6">
        <div className="mx-auto min-h-[680px] max-w-[760px] bg-white px-6 py-8 text-slate-950 shadow-sm sm:px-10 sm:py-12">
          <h2 className="text-3xl font-black uppercase tracking-tight text-slate-950">
            {cv.name || "Nombre del candidato"}
          </h2>
          {cv.title ? (
            <p className="mt-1 text-sm font-black uppercase tracking-[0.12em] text-slate-600">
              {cv.title}
            </p>
          ) : null}
          {cv.contact ? (
            <p className="mt-3 border-b border-slate-200 pb-5 text-sm leading-6 text-slate-600">
              {cv.contact}
            </p>
          ) : null}

          {cv.summary ? (
            <CVSection title="Resumen profesional">
              <p className="text-sm leading-7 text-slate-700">{cv.summary}</p>
            </CVSection>
          ) : null}

          {cv.experience.length > 0 ? (
            <CVSection title="Experiencia laboral">
              <div className="space-y-5">
                {cv.experience.map((item) => (
                  <div key={`${item.role}-${item.company}-${item.period}`}>
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                      <h3 className="text-sm font-black text-slate-950">
                        {item.role}{" "}
                        <span className="font-semibold text-slate-500">
                          - {item.company}
                        </span>
                      </h3>
                      <p className="text-xs font-semibold text-slate-500">
                        {item.period}
                      </p>
                    </div>
                    <ul className="mt-2 space-y-1.5 pl-4">
                      {item.bullets.map((line) => (
                        <li
                          key={line}
                          className="list-disc text-sm leading-6 text-slate-700 marker:text-slate-400"
                        >
                          {line}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </CVSection>
          ) : null}

          {cv.education.length > 0 ? (
            <CVSection title="Educacion">
              <div className="space-y-4">
                {cv.education.map((item) => (
                  <div key={`${item.degree}-${item.institution}-${item.period}`}>
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                      <h3 className="text-sm font-black text-slate-950">
                        {item.degree}
                      </h3>
                      <p className="text-xs font-semibold text-slate-500">
                        {item.period}
                      </p>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{item.institution}</p>
                    {item.description ? (
                      <p className="mt-1 text-sm italic text-slate-600">
                        {item.description}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </CVSection>
          ) : null}

          {cv.skills.length > 0 ? (
            <CVSection title="Habilidades">
              <p className="text-sm leading-7 text-slate-700">
                {cv.skills.join(" - ")}
              </p>
            </CVSection>
          ) : null}

          {cv.projects?.length ? (
            <CVSection title="Proyectos">
              <div className="space-y-4">
                {cv.projects.map((item) => (
                  <div key={`${item.name}-${item.period || ""}`}>
                    <h3 className="text-sm font-black text-slate-950">
                      {item.name}
                      {item.period ? (
                        <span className="font-semibold text-slate-500">
                          {" "}
                          - {item.period}
                        </span>
                      ) : null}
                    </h3>
                    <ul className="mt-2 space-y-1.5 pl-4">
                      {item.bullets.map((line) => (
                        <li
                          key={line}
                          className="list-disc text-sm leading-6 text-slate-700 marker:text-slate-400"
                        >
                          {line}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </CVSection>
          ) : null}

          {cv.certifications?.length ? (
            <CVSection title="Certificaciones">
              <ul className="grid gap-2 sm:grid-cols-2">
                {cv.certifications.map((item) => (
                  <li
                    key={item}
                    className="list-inside list-disc text-sm text-slate-700 marker:text-slate-400"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </CVSection>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function CVSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-7 border-t border-slate-200 pt-5">
      <h3 className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-slate-950">
        {title}
      </h3>
      {children}
    </section>
  );
}
