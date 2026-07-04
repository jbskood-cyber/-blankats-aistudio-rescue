"use client";

import Image from "next/image";
import type { ChangeEvent, DragEvent, ReactNode } from "react";
import { useMemo, useRef, useState } from "react";
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

  const currentAnalysis = analysis ?? demoAnalysis;
  const currentFileName = file?.name || "mi-cv.pdf";
  const canAnalyze = useMemo(() => Boolean(file || pastedText.trim()), [file, pastedText]);

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
    setScreen("analyzing");
    setVisualNote(null);

    try {
      if (!canAnalyze) {
        await wait(1500);
        setAnalysis(demoAnalysis);
        setScreen("diagnosis");
        return;
      }

      const pdfBase64 = file ? await fileToBase64(file) : undefined;
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pdfBase64,
          originalText: pastedText.trim() || undefined,
        }),
      });

      if (!response.ok) throw new Error("El análisis real no respondió en local.");

      const data = (await response.json()) as AnalysisResponse;
      data.improvedCV = sanitizeImprovedCV(data.improvedCV);
      setAnalysis(data);
    } catch {
      setAnalysis(demoAnalysis);
      setVisualNote("Vista demo: el diseño se puede revisar aunque el análisis real no esté disponible en local.");
    } finally {
      await wait(900);
      setScreen("diagnosis");
    }
  };

  const downloadPDF = async () => {
    if (!currentAnalysis.deliveryDecision.allowDownload) {
      setVisualNote(currentAnalysis.deliveryDecision.userMessage);
      setScreen("diagnosis");
      return;
    }

    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF("p", "pt", "a4");
    const cv = currentAnalysis.improvedCV;
    const margin = 50;
    let y = 56;

    const write = (text: string, size = 10, bold = false) => {
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setFontSize(size);
      const lines = doc.splitTextToSize(text, 495);
      lines.forEach((line: string) => {
        if (y > 780) {
          doc.addPage();
          y = margin;
        }
        doc.text(line, margin, y);
        y += size + 6;
      });
    };

    write(cv.name || "CV BlankATS", 22, true);
    if (cv.title) write(cv.title, 12, true);
    if (cv.contact) write(cv.contact, 9);
    y += 12;
    if (cv.summary) {
      write("Resumen profesional", 11, true);
      write(cv.summary, 9);
    }
    cv.experience.forEach((item) => {
      y += 10;
      write(`${item.role} · ${item.company}`, 11, true);
      if (item.period) write(item.period, 9);
      item.bullets.forEach((bullet) => write(`- ${bullet}`, 9));
    });
    if (cv.education.length) {
      y += 10;
      write("Educación", 11, true);
      cv.education.forEach((item) => write(`${item.degree} · ${item.institution} · ${item.period}`, 9));
    }
    if (cv.skills.length) {
      y += 10;
      write("Habilidades", 11, true);
      write(cv.skills.join(", "), 9);
    }

    doc.save(`CV_BlankATS_${(cv.name || "usuario").replace(/\s+/g, "_")}.pdf`);
  };

  const downloadDoc = () => {
    const cv = currentAnalysis.improvedCV;
    const content = [
      cv.name,
      cv.title,
      cv.contact,
      "",
      "Resumen profesional",
      cv.summary,
      "",
      "Experiencia",
      ...cv.experience.flatMap((item) => [
        `${item.role} · ${item.company} · ${item.period}`,
        ...item.bullets.map((bullet) => `- ${bullet}`),
      ]),
      "",
      "Educación",
      ...cv.education.map((item) => `${item.degree} · ${item.institution} · ${item.period}`),
      "",
      "Habilidades",
      cv.skills.join(", "),
    ].join("\n");

    const blob = new Blob([content], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `CV_BlankATS_${(cv.name || "usuario").replace(/\s+/g, "_")}.doc`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const goHome = () => {
    setScreen("home");
    setAnalysis(null);
    setVisualNote(null);
  };

  return (
    <main className="min-h-screen bg-white text-[#070b2f]">
      <div className="mx-auto min-h-screen w-full max-w-[512px] bg-white">
        {screen === "home" ? <LandingScreen onGo={setScreen} /> : null}
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
        {screen === "analyzing" ? <AnalyzingScreen fileName={currentFileName} /> : null}
        {screen === "diagnosis" ? (
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
        {screen === "success" ? (
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

function LandingScreen({ onGo }: { onGo: (screen: Screen) => void }) {
  return (
    <ScreenShell>
      <SimpleHeader />

      <section className="px-11 pt-14 text-center">
        <h1 className="text-[46px] font-black leading-[0.98] tracking-[-0.035em]">
          Mejora tu CV
          <span className="block text-[#0068ff]">antes de enviarlo</span>
        </h1>
        <p className="mx-auto mt-5 max-w-[390px] text-[17px] font-medium leading-7 text-[#626a79]">
          Recibe un diagnóstico gratuito y desbloquea una versión profesional más clara, ordenada y lista para descargar.
        </p>
        <button className="mt-7 flex h-[58px] w-full items-center justify-center gap-3 rounded-[11px] bg-[#0068ff] text-[20px] font-black text-white shadow-[0_12px_24px_rgba(0,104,255,0.24)]" onClick={() => onGo("upload")}>
          <Sparkles className="h-5 w-5" />
          Analizar mi CV gratis
        </button>
      </section>

      <section className="px-11 pt-8">
        <HomeScoreCard />
      </section>

      <section className="px-11 pt-7">
        <h2 className="text-left text-[24px] font-black">Cómo funciona</h2>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <HowStep icon={<Upload className="h-9 w-9" />} number="1" title="Sube tu CV">
            Carga tu PDF y nuestra IA lo analiza al instante.
          </HowStep>
          <HowStep icon={<BarChart3 className="h-9 w-9" />} number="2" title="Recibe diagnóstico">
            Obtén tu puntaje y una lista de mejoras clave.
          </HowStep>
          <HowStep icon={<FileText className="h-9 w-9" />} number="3" title="Desbloquea versión mejorada">
            Descarga tu CV optimizado listo para enviar.
          </HowStep>
        </div>
      </section>

      <section className="px-11 pt-8">
        <OfferCard onClick={() => onGo("paywall")} />
      </section>

      <ProtectedNote className="mt-5 pb-8" />
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
      <section className="px-9 pt-9 text-center">
        <Badge icon={<CloudUpload className="h-4 w-4" />}>Carga de CV</Badge>
        <h1 className="mt-7 text-[56px] font-black leading-none tracking-[-0.04em]">
          Sube tu <span className="text-[#0068ff]">CV</span>
        </h1>
        <p className="mx-auto mt-5 max-w-[390px] text-[20px] font-medium leading-9 text-[#626a79]">
          Carga tu archivo PDF o pega el texto de tu currículum para recibir un diagnóstico gratuito.
        </p>
      </section>

      <section className="px-8 pt-8">
        <div className="grid h-[66px] grid-cols-2 rounded-[14px] border border-[#dbe2ec] bg-white p-1 shadow-[0_8px_20px_rgba(15,25,55,0.04)]">
          <TabButton active={inputMode === "pdf"} icon={<FileText className="h-6 w-6" />} onClick={() => onMode("pdf")}>
            Archivo PDF
          </TabButton>
          <TabButton active={inputMode === "text"} icon={<PenLine className="h-6 w-6" />} onClick={() => onMode("text")}>
            Pegar texto
          </TabButton>
        </div>

        <div className="mt-7 rounded-[18px] border border-[#e8edf4] bg-white p-5 shadow-[0_14px_34px_rgba(15,25,55,0.08)]">
          {inputMode === "pdf" ? (
            <div
              className={`relative grid min-h-[278px] place-items-center rounded-[14px] border-2 border-dashed p-7 text-center ${
                dragActive ? "border-[#0068ff] bg-[#f4f8ff]" : "border-[#8aa5c7] bg-white"
              }`}
              onDragEnter={onDrag}
              onDragLeave={onDrag}
              onDragOver={onDrag}
              onDrop={onDrop}
            >
              <input ref={fileInputRef} type="file" accept="application/pdf" className="sr-only" onChange={onFileChange} />
              <button className="absolute inset-0 cursor-pointer" aria-label="Seleccionar PDF" onClick={() => fileInputRef.current?.click()} type="button" />
              <div>
                <div className="mx-auto grid h-[92px] w-[92px] place-items-center rounded-full bg-[#edf5ff] text-[#0068ff]">
                  <FileText className="h-12 w-12" />
                </div>
                <h2 className="mt-8 text-[26px] font-black tracking-[-0.02em]">
                  {file ? file.name : <>Arrastra o <span className="text-[#0068ff]">selecciona</span> tu CV</>}
                </h2>
                <p className="mt-4 text-[20px] font-medium text-[#8a929f]">Solo PDF · Máx. 10 MB</p>
              </div>
            </div>
          ) : (
            <textarea
              value={pastedText}
              onChange={(event) => onText(event.target.value)}
              className="min-h-[278px] w-full resize-none rounded-[14px] border-2 border-dashed border-[#8aa5c7] bg-white p-6 text-[17px] leading-8 text-[#070b2f] outline-none placeholder:text-[#8a929f]"
              placeholder="Pega aquí el texto de tu currículum para recibir el diagnóstico visual."
            />
          )}
        </div>

        <div className="mt-6 flex items-center gap-5 rounded-[16px] border border-[#e7edf5] bg-white p-5 shadow-[0_10px_26px_rgba(15,25,55,0.05)]">
          <div className="grid h-[72px] w-[72px] shrink-0 place-items-center rounded-full bg-[#edf5ff] text-[#0068ff]">
            <ShieldCheck className="h-11 w-11" />
          </div>
          <p className="text-[18px] font-medium leading-8 text-[#626a79]">
            <span className="font-black text-[#070b2f]">Tus datos están protegidos.</span> No compartimos tu información y tu archivo se usa solo para el análisis.
          </p>
        </div>

        {note ? <p className="mt-4 rounded-[12px] bg-[#fff7e9] px-4 py-3 text-[14px] font-bold leading-6 text-[#935a12]">{note}</p> : null}

        <button className="mt-7 flex h-[66px] w-full items-center justify-center gap-4 rounded-[13px] bg-[#0068ff] text-[22px] font-black text-white shadow-[0_12px_24px_rgba(0,104,255,0.24)] disabled:bg-[#9fc7ff]" disabled={!canAnalyze} onClick={onAnalyze}>
          <Sparkles className="h-7 w-7" />
          Analizar mi CV
        </button>
      </section>
    </ScreenShell>
  );
}

function AnalyzingScreen({ fileName }: { fileName: string }) {
  return (
    <ScreenShell>
      <SimpleHeader />
      <section className="px-10 pt-10 text-center">
        <Badge icon={<Sparkles className="h-4 w-4" />}>Procesando tu CV</Badge>
        <h1 className="mt-7 text-[48px] font-black leading-none tracking-[-0.04em]">Analizando tu CV</h1>
        <p className="mt-5 text-[18px] font-medium text-[#626a79]">Estamos revisando estructura, claridad y formato.</p>
        <div className="mt-8">
          <ProgressRing value={72} mode="percent" size={205} />
        </div>
      </section>

      <section className="px-10 pt-7">
        <div className="flex items-center gap-6 rounded-[14px] border border-[#e4e9f0] bg-white p-5 shadow-[0_10px_26px_rgba(15,25,55,0.06)]">
          <PdfIcon />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[22px] font-black">{fileName}</p>
            <p className="mt-1 text-[16px] font-medium text-[#626a79]">4.4 KB · PDF</p>
          </div>
          <CheckCircle2 className="h-10 w-10 shrink-0 text-[#18b965]" />
        </div>

        <div className="mt-5 rounded-[15px] border border-[#e4e9f0] bg-white p-7 shadow-[0_10px_26px_rgba(15,25,55,0.06)]">
          <TimelineStep done number="1" title="Extrayendo texto">Obteniendo y estructurando el texto de tu documento.</TimelineStep>
          <TimelineStep done number="2" title="Analizando contenido">Evaluando claridad, relevancia y estructura.</TimelineStep>
          <TimelineStep active number="3" title="Optimizando formato">Mejorando presentación, secciones y legibilidad.</TimelineStep>
          <TimelineStep number="4" title="Generando versión mejorada">Redactando sugerencias y preparando tu CV optimizado.</TimelineStep>
        </div>

        <div className="mt-6 flex items-center justify-center gap-3 border-b border-[#edf0f5] pb-5 text-[18px] font-medium text-[#626a79]">
          <Clock3 className="h-7 w-7 text-[#0068ff]" />
          Esto tarda menos de 1 minuto
        </div>
      </section>

      <section className="px-10 pt-5 pb-8">
        <h2 className="text-[25px] font-black">¿Qué estamos evaluando?</h2>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <EvalCard icon={<FileText className="h-8 w-8" />} title="Formato">Estructura, orden y legibilidad del CV.</EvalCard>
          <EvalCard icon={<UserRound className="h-8 w-8" />} title="Contenido">Relevancia, claridad y palabras clave.</EvalCard>
          <EvalCard icon={<Star className="h-8 w-8" />} title="Impacto">Alineación con el puesto y resultados.</EvalCard>
        </div>
      </section>
    </ScreenShell>
  );
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
  return (
    <ScreenShell>
      <BackHeader onBack={onBack} />
      <section className="px-10 pt-5 text-center">
        <Badge icon={<Sparkles className="h-4 w-4" />}>Diagnóstico gratuito</Badge>
        <h1 className="mt-6 text-[44px] font-black leading-none tracking-[-0.035em]">Tu diagnóstico</h1>
        <p className="mt-4 text-[18px] font-medium text-[#626a79]">Detectamos oportunidades de mejora en tu CV.</p>
      </section>

      <section className="px-10 pt-6 pb-7">
        <div className="grid grid-cols-[155px_1fr] items-center gap-7 rounded-[15px] border border-[#e4e9f0] bg-white p-6 shadow-[0_10px_26px_rgba(15,25,55,0.06)]">
          <ProgressRing value={analysis.score || 78} mode="score" size={135} />
          <div className="border-l border-[#e8edf4] pl-8">
            <h2 className="text-[24px] font-black leading-tight">Buen potencial, pero hay áreas a mejorar.</h2>
            <p className="mt-5 text-[16px] font-medium leading-7 text-[#626a79]">Tu CV tiene una base sólida. Con algunos ajustes, puedes aumentar su claridad, relevancia e impacto.</p>
          </div>
        </div>

        {note ? <p className="mt-4 rounded-[12px] bg-[#fff7e9] px-4 py-3 text-[14px] font-bold leading-6 text-[#935a12]">{note}</p> : null}

        <SectionTitle number="1" title="Problemas detectados" />
        <div className="rounded-[15px] border border-[#e4e9f0] bg-white shadow-[0_8px_22px_rgba(15,25,55,0.05)]">
          {problemRows(analysis).map((item) => <ProblemLine key={item.label} {...item} />)}
        </div>

        <SectionTitle number="2" title="Secciones detectadas" />
        <div className="flex flex-wrap gap-3">
          <Chip ok>Experiencia</Chip>
          <Chip ok>Educación</Chip>
          <Chip ok>Habilidades</Chip>
          <Chip warn>Falta: {analysis.missingSections[0] || "Resumen"}</Chip>
        </div>

        <SectionTitle number="3" title="Recomendaciones clave" />
        <div className="grid grid-cols-3 gap-3">
          <RecoCard icon={<UserRound className="h-7 w-7" />} title="Mejora el resumen">Añade un resumen profesional claro que comunique tu valor.</RecoCard>
          <RecoCard icon={<BarChart3 className="h-7 w-7" />} title="Refuerza logros">Cuantifica resultados para demostrar el impacto de tu trabajo.</RecoCard>
          <RecoCard icon={<Search className="h-7 w-7" />} title="Optimiza palabras clave">Incluye términos relevantes para destacar.</RecoCard>
        </div>

        <SectionTitle number="4" title="Versión mejorada" />
        <LockedPreview />

        <button className="mt-4 flex h-[56px] w-full items-center justify-center gap-4 rounded-[8px] bg-[#0068ff] text-[20px] font-black text-white shadow-[0_10px_22px_rgba(0,104,255,0.22)]" onClick={onUnlock}>
          <Lock className="h-7 w-7" />
          Desbloquear mi CV mejorado
        </button>

        <div className="mt-5 grid grid-cols-3 divide-x divide-[#e2e8f0] text-center text-[14px] font-medium text-[#626a79]">
          <TrustItem icon={<FileDown className="h-7 w-7" />}>Pago único</TrustItem>
          <TrustItem icon={<FileText className="h-7 w-7" />}>Descarga en PDF</TrustItem>
          <TrustItem icon={<ShieldCheck className="h-7 w-7" />}>Pago seguro</TrustItem>
        </div>
      </section>
    </ScreenShell>
  );
}

function PaywallScreen({ onBack, onUnlock }: { onBack: () => void; onUnlock: () => void }) {
  return (
    <ScreenShell>
      <div className="px-10 pt-9">
        <button aria-label="Volver" className="mb-5 text-[#070b2f]" onClick={onBack}>
          <ArrowLeft className="h-9 w-9" />
        </button>
        <div className="flex justify-center">
          <BrandLogo large />
        </div>
      </div>
      <section className="px-10 pt-10 text-center">
        <h1 className="text-[48px] font-black leading-[1.02] tracking-[-0.04em]">
          Desbloquea tu
          <span className="block text-[#0068ff]">CV mejorado</span>
        </h1>
        <p className="mt-5 text-[19px] font-medium text-[#626a79]">Conoce lo que ya optimizamos en tu documento.</p>
      </section>

      <section className="px-10 pt-6 pb-8">
        <div className="grid grid-cols-[1fr_1fr] gap-5 rounded-[16px] border border-[#e4e9f0] bg-white p-5 shadow-[0_10px_26px_rgba(15,25,55,0.05)]">
          <MiniCvLocked />
          <div className="text-left">
            <h2 className="text-[21px] font-black">Vista final protegida</h2>
            <p className="mt-3 text-[18px] font-medium leading-8 text-[#626a79]">Tu nueva versión está lista para ayudarte a destacar.</p>
          </div>
        </div>

        <div className="mt-6 rounded-[16px] border border-[#e4e9f0] bg-white p-6 shadow-[0_10px_26px_rgba(15,25,55,0.05)]">
          <h2 className="text-center text-[25px] font-black">Tu nueva versión incluye</h2>
          <FeatureLine icon={<PenLine className="h-7 w-7" />}>Resumen profesional reescrito</FeatureLine>
          <FeatureLine icon={<Trophy className="h-7 w-7" />}>Logros más claros</FeatureLine>
          <FeatureLine icon={<FileText className="h-7 w-7" />}>Formato limpio</FeatureLine>
          <FeatureLine icon={<Layers3 className="h-7 w-7" />}>Secciones reorganizadas</FeatureLine>
          <FeatureLine icon={<Search className="h-7 w-7" />}>Palabras clave reforzadas</FeatureLine>
          <FeatureLine icon={<Download className="h-7 w-7" />}>PDF listo para descargar</FeatureLine>
        </div>

        <div className="mt-6 rounded-[16px] border border-[#e4e9f0] bg-white p-6 text-center shadow-[0_10px_26px_rgba(15,25,55,0.05)]">
          <div className="flex items-end justify-center gap-6">
            <span className="pb-3 text-[28px] font-bold text-[#6f7682] line-through">$99 MXN</span>
            <span className="text-[70px] font-black leading-none text-[#0068ff]">$49</span>
            <span className="pb-4 text-[23px] font-black text-[#0068ff]">MXN</span>
          </div>
          <p className="mt-2 text-[17px] font-medium text-[#626a79]">Pago único · Sin suscripciones</p>
          <button className="mt-6 flex h-[58px] w-full items-center justify-center gap-4 rounded-[10px] bg-[#0068ff] text-[20px] font-black text-white" onClick={onUnlock}>
            Desbloquear mi CV profesional
            <ArrowRight className="h-7 w-7" />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-3 divide-x divide-[#e2e8f0] rounded-[13px] border border-[#e7edf5] bg-white py-3 text-center text-[13px] font-black text-[#070b2f]">
          <TrustItem icon={<ShieldCheck className="h-8 w-8" />}>Pago único</TrustItem>
          <TrustItem icon={<Sparkles className="h-8 w-8" />}>Entrega inmediata</TrustItem>
          <TrustItem icon={<Lock className="h-8 w-8" />}>Tus datos están protegidos</TrustItem>
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
      <header className="flex items-center justify-between px-8 pt-8">
        <BrandLogo />
        <button className="flex h-[45px] items-center gap-3 rounded-[8px] border border-[#cad8e8] bg-white px-5 text-[17px] font-black text-[#0c55b8]" onClick={onHome}>
          <Home className="h-5 w-5" />
          Ir al inicio
        </button>
      </header>

      <section className="px-10 pt-9 text-center">
        <div className="mx-auto grid h-[118px] w-[118px] place-items-center rounded-full bg-[#e4f9ef] text-[#0fbd68] shadow-[0_0_0_18px_rgba(228,249,239,0.45)]">
          <Check className="h-16 w-16" strokeWidth={5} />
        </div>
        <h1 className="mt-10 text-[48px] font-black leading-none tracking-[-0.04em]">¡Tu CV está listo!</h1>
        <p className="mt-5 text-[20px] font-medium text-[#626a79]">Hemos generado tu versión mejorada.</p>
      </section>

      <section className="px-10 pt-8 pb-8">
        <div className="flex items-center gap-6 rounded-[16px] border border-[#e4e9f0] bg-white p-6 shadow-[0_10px_26px_rgba(15,25,55,0.06)]">
          <PdfIcon large />
          <div className="min-w-0 flex-1 text-left">
            <p className="truncate text-[25px] font-black">CV_Josue_Bravo_BlankATS.pdf</p>
            <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#dff8ec] px-4 py-2 text-[16px] font-black text-[#129853]">
              <CheckCircle2 className="h-5 w-5" />
              Generado
            </span>
          </div>
        </div>

        <div className="mt-7 space-y-4">
          <button className="flex h-[64px] w-full items-center justify-center gap-4 rounded-[10px] bg-[#0068ff] text-[22px] font-black text-white shadow-[0_12px_24px_rgba(0,104,255,0.24)]" onClick={onPdf} disabled={!analysis.deliveryDecision.allowDownload}>
            <Download className="h-8 w-8" />
            Descargar PDF
          </button>
          <button className="flex h-[58px] w-full items-center justify-center gap-4 rounded-[10px] border border-[#0068ff] bg-white text-[20px] font-black text-[#0068ff]" onClick={onDoc}>
            <FileDown className="h-7 w-7" />
            Descargar DOCX
          </button>
        </div>

        <h2 className="mt-9 text-center text-[25px] font-black">Qué mejoramos</h2>
        <div className="mt-5 grid grid-cols-3 gap-4">
          <ImprovedCard icon={<FileText className="h-9 w-9" />} title="Resumen optimizado">Reescribimos tu perfil para hacerlo más claro, impactante y relevante.</ImprovedCard>
          <ImprovedCard icon={<BarChart3 className="h-9 w-9" />} title="Logros reforzados" tone="green">Destacamos tus resultados con métricas y verbos de alto impacto.</ImprovedCard>
          <ImprovedCard icon={<Layers3 className="h-9 w-9" />} title="Formato limpio" tone="purple">Diseño profesional, escaneable y optimizado para los ATS.</ImprovedCard>
        </div>

        <ProtectedNote className="mt-9" />
        <p className="sr-only">Archivo original: {fileName}</p>
      </section>
    </ScreenShell>
  );
}

function ScreenShell({ children }: { children: ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }} className="min-h-screen bg-white">
      {children}
    </motion.div>
  );
}

function SimpleHeader() {
  return (
    <header className="px-9 pt-8">
      <BrandLogo />
    </header>
  );
}

function BackHeader({ onBack }: { onBack: () => void }) {
  return (
    <header className="flex items-center gap-5 px-8 pt-8">
      <button aria-label="Volver" className="text-[#070b2f]" onClick={onBack}>
        <ArrowLeft className="h-9 w-9" />
      </button>
      <BrandLogo />
    </header>
  );
}

function BrandLogo({ large = false }: { large?: boolean }) {
  return (
    <Image
      src="/blankats-wordmark.png"
      alt="BlankATS"
      width={640}
      height={190}
      priority
      className={`${large ? "h-[64px]" : "h-[45px]"} w-auto object-contain`}
    />
  );
}

function Badge({ children, icon }: { children: ReactNode; icon: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-3 rounded-full border border-[#dbe8f8] bg-[#edf5ff] px-5 py-2 text-[17px] font-black text-[#0c55b8] shadow-[inset_0_1px_1px_rgba(255,255,255,0.9)]">
      <span className="text-[#0068ff]">{icon}</span>
      {children}
    </span>
  );
}

function HomeScoreCard() {
  return (
    <div className="grid grid-cols-[160px_1fr] items-center gap-7 rounded-[15px] border border-[#e4e9f0] bg-white p-6 shadow-[0_10px_26px_rgba(15,25,55,0.07)]">
      <ProgressRing value={78} mode="score" size={135} />
      <div className="border-l border-[#e8edf4] pl-7 text-left">
        <h2 className="text-[25px] font-black">Buen potencial</h2>
        <span className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#def8eb] px-4 py-2 text-[16px] font-black text-[#129853]">
          <CheckCircle2 className="h-5 w-5" />
          Análisis completado
        </span>
        <TinyIssue icon={<AlertTriangle className="h-5 w-5" />} text="Faltan palabras clave relevantes" />
        <TinyIssue icon={<AlertTriangle className="h-5 w-5" />} text="Formato menos compatible" amber />
        <TinyIssue icon={<Circle className="h-5 w-5" />} text="Poca cuantificación de logros" blue />
      </div>
    </div>
  );
}

function ProgressRing({ value, mode, size }: { value: number; mode: "score" | "percent"; size: number }) {
  const inner = size - 24;
  return (
    <div className="mx-auto grid place-items-center rounded-full" style={{ width: size, height: size, background: `conic-gradient(${blue} 0deg ${value * 3.6}deg, #e8f1ff ${value * 3.6}deg 360deg)` }}>
      <div className="grid place-items-center rounded-full bg-white" style={{ width: inner, height: inner }}>
        <div className="text-center">
          <p className={`${mode === "percent" ? "text-[54px]" : "text-[48px]"} font-black leading-none tracking-[-0.04em]`}>
            {value}
            {mode === "percent" ? <span className="text-[27px]">%</span> : null}
          </p>
          <p className={`${mode === "percent" ? "mt-2 text-[20px] text-[#626a79]" : "mt-2 text-[20px] text-[#626a79]"} font-medium`}>
            {mode === "percent" ? "Analizando..." : "/100"}
          </p>
        </div>
      </div>
    </div>
  );
}

function TinyIssue({ amber, blue: isBlue, icon, text }: { amber?: boolean; blue?: boolean; icon: ReactNode; text: string }) {
  return (
    <div className="mt-4 flex items-center gap-4 border-b border-[#eef2f6] pb-3 last:border-b-0">
      <span className={amber ? "text-[#d48624]" : isBlue ? "text-[#0c66d8]" : "text-[#cf334b]"}>{icon}</span>
      <span className="flex-1 text-[15px] font-medium">{text}</span>
      <ChevronRight className="h-5 w-5 text-[#9ba4b2]" />
    </div>
  );
}

function HowStep({ children, icon, number, title }: { children: ReactNode; icon: ReactNode; number: string; title: string }) {
  return (
    <div className="text-center">
      <div className="relative mx-auto grid h-[76px] w-[76px] place-items-center rounded-full bg-[#edf5ff] text-[#0068ff]">
        <span className="absolute -left-1 -top-2 grid h-7 w-7 place-items-center rounded-full bg-[#0068ff] text-[16px] font-black text-white">{number}</span>
        {icon}
      </div>
      <h3 className="mt-4 text-[15px] font-black leading-5">{title}</h3>
      <p className="mt-2 text-[13px] font-medium leading-5 text-[#626a79]">{children}</p>
    </div>
  );
}

function OfferCard({ onClick }: { onClick: () => void }) {
  return (
    <div className="rounded-[15px] border border-[#e4e9f0] bg-white p-5 shadow-[0_10px_26px_rgba(15,25,55,0.06)]">
      <div className="grid grid-cols-[84px_1fr_22px] items-center gap-5">
        <div className="grid h-[78px] w-[78px] place-items-center rounded-full bg-white text-[#0068ff] shadow-[0_8px_24px_rgba(15,25,55,0.10)]">
          <Trophy className="h-10 w-10" />
        </div>
        <div>
          <h2 className="text-[22px] font-black">Desbloquea tu CV profesional</h2>
          <p className="mt-1 text-[15px] font-medium text-[#626a79]">Versión más clara, ordenada y lista para destacar.</p>
          <div className="mt-4 flex items-end gap-4">
            <span className="pb-2 text-[22px] font-bold text-[#6f7682] line-through">$99 MXN</span>
            <span className="text-[48px] font-black leading-none">$49</span>
            <span className="pb-2 text-[19px] font-black text-[#0068ff]">MXN</span>
            <span className="mb-2 rounded-full bg-[#edf5ff] px-3 py-1 text-[12px] font-black text-[#0c55b8]">Pago único</span>
          </div>
        </div>
        <ChevronRight className="h-8 w-8 text-[#778293]" />
      </div>
      <button className="mt-5 flex h-[55px] w-full items-center justify-center gap-3 rounded-[8px] bg-[#0068ff] text-[18px] font-black text-white" onClick={onClick}>
        <Lock className="h-5 w-5" />
        Desbloquear mi CV profesional
      </button>
    </div>
  );
}

function ProtectedNote({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-4 text-center ${className}`}>
      <ShieldCheck className="h-9 w-9 text-[#0068ff]" />
      <p className="text-[16px] font-medium leading-6 text-[#626a79]">
        <span className="font-black text-[#070b2f]">Tus datos están protegidos.</span>
        <br />
        No compartimos tu información.
      </p>
    </div>
  );
}

function TabButton({ active, children, icon, onClick }: { active: boolean; children: ReactNode; icon: ReactNode; onClick: () => void }) {
  return (
    <button className={`flex items-center justify-center gap-4 rounded-[10px] text-[20px] font-black ${active ? "bg-[#0068ff] text-white shadow-[0_8px_16px_rgba(0,104,255,0.22)]" : "text-[#5f6673]"}`} onClick={onClick}>
      {icon}
      {children}
    </button>
  );
}

function PdfIcon({ large = false }: { large?: boolean }) {
  return (
    <div className={`grid ${large ? "h-[92px] w-[92px]" : "h-[62px] w-[62px]"} place-items-center rounded-[10px] border border-[#f1d7d7] bg-white text-[#e1242f]`}>
      <FileText className={large ? "h-12 w-12" : "h-9 w-9"} />
      <span className="-mt-2 text-[13px] font-black">PDF</span>
    </div>
  );
}

function TimelineStep({ active, children, done, number, title }: { active?: boolean; children: ReactNode; done?: boolean; number: string; title: string }) {
  return (
    <div className="grid grid-cols-[46px_1fr] gap-5 pb-7 last:pb-0">
      <div className="relative flex justify-center">
        {number !== "4" ? <span className="absolute top-9 h-full w-px bg-[#d6f2e5]" /> : null}
        <span className={`relative z-10 grid h-9 w-9 place-items-center rounded-full text-[17px] font-black ${done ? "bg-[#9ff0c8] text-[#0f9f57]" : active ? "border-4 border-[#0068ff] bg-white text-[#0068ff]" : "bg-[#eef2f7] text-[#6f7682]"}`}>
          {done ? <Check className="h-5 w-5" strokeWidth={4} /> : active ? "" : number}
        </span>
      </div>
      <div>
        <h3 className={`text-[22px] font-black ${active ? "text-[#0068ff]" : "text-[#070b2f]"}`}>{number}.&nbsp;&nbsp;{title}</h3>
        <p className="mt-2 text-[16px] font-medium leading-7 text-[#626a79]">{children}</p>
      </div>
    </div>
  );
}

function EvalCard({ children, icon, title }: { children: ReactNode; icon: ReactNode; title: string }) {
  return (
    <div className="rounded-[14px] border border-[#e4e9f0] bg-white p-4 text-center shadow-[0_8px_20px_rgba(15,25,55,0.05)]">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-[12px] bg-[#edf5ff] text-[#0068ff]">{icon}</div>
      <h3 className="mt-4 text-[18px] font-black">{title}</h3>
      <p className="mt-3 text-[14px] font-medium leading-6 text-[#626a79]">{children}</p>
    </div>
  );
}

function problemRows(analysis: AnalysisResponse) {
  const labels = analysis.problems.length ? analysis.problems : demoAnalysis.problems;
  const severities = [
    { severity: "Alto", tone: "red" as const },
    { severity: "Medio", tone: "amber" as const },
    { severity: "Medio", tone: "amber" as const },
    { severity: "Bajo", tone: "blue" as const },
  ];
  return labels.slice(0, 4).map((label, index) => ({ label, ...severities[index] }));
}

function SectionTitle({ number, title }: { number: string; title: string }) {
  return <h2 className="mt-6 mb-3 text-[20px] font-black">{number}. {title}</h2>;
}

function ProblemLine({ label, severity, tone }: { label: string; severity: string; tone: "red" | "amber" | "blue" }) {
  const colors = {
    red: "text-[#cf334b] bg-[#ffecef]",
    amber: "text-[#b96b13] bg-[#fff3e3]",
    blue: "text-[#0c66d8] bg-[#edf5ff]",
  };
  return (
    <div className="flex h-[54px] items-center gap-4 border-b border-[#edf0f5] px-5 last:border-b-0">
      <AlertTriangle className={`h-6 w-6 ${tone === "red" ? "text-[#cf334b]" : tone === "amber" ? "text-[#d48624]" : "text-[#0c66d8]"}`} />
      <span className="flex-1 text-[16px] font-medium">{label}</span>
      <span className={`rounded-full px-4 py-1 text-[13px] font-black ${colors[tone]}`}>{severity}</span>
      <ChevronRight className="h-5 w-5 text-[#9ba4b2]" />
    </div>
  );
}

function Chip({ children, ok, warn }: { children: ReactNode; ok?: boolean; warn?: boolean }) {
  return (
    <span className={`inline-flex h-[44px] items-center gap-2 rounded-full border px-5 text-[16px] font-medium shadow-[0_6px_14px_rgba(15,25,55,0.04)] ${ok ? "border-[#d7f2e5] bg-white text-[#15995a]" : warn ? "border-[#ffe2bd] bg-[#fff5e7] text-[#a86315]" : ""}`}>
      {ok ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
      {children}
    </span>
  );
}

function RecoCard({ children, icon, title }: { children: ReactNode; icon: ReactNode; title: string }) {
  return (
    <div className="rounded-[11px] border border-[#e4e9f0] bg-white p-4 shadow-[0_8px_20px_rgba(15,25,55,0.05)]">
      <div className="grid h-12 w-12 place-items-center rounded-full bg-[#edf5ff] text-[#0068ff]">{icon}</div>
      <h3 className="mt-4 text-[16px] font-black leading-5">{title}</h3>
      <p className="mt-2 text-[13px] font-medium leading-5 text-[#626a79]">{children}</p>
      <ChevronRight className="ml-auto mt-2 h-5 w-5 text-[#9ba4b2]" />
    </div>
  );
}

function LockedPreview() {
  return (
    <div className="relative grid h-[120px] grid-cols-[1fr_1fr] overflow-hidden rounded-[10px] border border-[#d9e4f1] bg-white">
      <div className="p-5 text-[16px] font-medium leading-7 text-[#626a79]">
        Esta es una vista previa de cómo se verá tu CV optimizado. Desbloquéalo para conocer todos los detalles y descargarlo.
      </div>
      <MiniCvLocked />
      <div className="absolute inset-0 grid place-items-center">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-white text-[#0068ff] shadow-[0_10px_28px_rgba(15,25,55,0.16)]">
          <Lock className="h-8 w-8" />
        </div>
      </div>
    </div>
  );
}

function MiniCvLocked() {
  return (
    <div className="relative overflow-hidden rounded-[10px] bg-white p-5 blur-[1.8px]">
      <div className="h-9 w-9 rounded-full bg-[#d6dbe3]" />
      <div className="mt-3 h-3 w-32 rounded bg-[#cfd8e5]" />
      <div className="mt-2 h-2 w-40 rounded bg-[#dbe2ec]" />
      <div className="mt-6 space-y-2">
        <span className="block h-2 w-full rounded bg-[#dbe2ec]" />
        <span className="block h-2 w-10/12 rounded bg-[#dbe2ec]" />
        <span className="block h-2 w-11/12 rounded bg-[#dbe2ec]" />
      </div>
    </div>
  );
}

function TrustItem({ children, icon }: { children: ReactNode; icon: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-2 text-[#626a79]">
      <span className="text-[#0068ff]">{icon}</span>
      <span>{children}</span>
    </div>
  );
}

function FeatureLine({ children, icon }: { children: ReactNode; icon: ReactNode }) {
  return (
    <div className="mt-4 flex items-center gap-6 border-b border-[#edf0f5] pb-4 last:border-b-0">
      <div className="grid h-12 w-12 place-items-center rounded-[10px] bg-[#edf5ff] text-[#0068ff]">{icon}</div>
      <span className="text-[20px] font-medium">{children}</span>
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
    <div className="rounded-[14px] border border-[#e4e9f0] bg-white p-5 text-center shadow-[0_8px_20px_rgba(15,25,55,0.05)]">
      <div className={`mx-auto grid h-16 w-16 place-items-center rounded-full ${colors[tone]}`}>{icon}</div>
      <h3 className="mt-5 text-[17px] font-black leading-5">{title}</h3>
      <p className="mt-3 text-[14px] font-medium leading-6 text-[#626a79]">{children}</p>
    </div>
  );
}
