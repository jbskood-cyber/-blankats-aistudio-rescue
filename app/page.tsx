"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  FileCheck2,
  FileText,
  FileUp,
  LockKeyhole,
  ScanLine,
  ShieldCheck,
  Sparkles,
  WandSparkles,
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

type ScreenId =
  | "hero"
  | "upload"
  | "analyzing"
  | "diagnosis"
  | "unlock"
  | "success"
  | "preview";

const screens: { id: ScreenId; label: string }[] = [
  { id: "hero", label: "Inicio" },
  { id: "upload", label: "Subida" },
  { id: "analyzing", label: "Analisis" },
  { id: "diagnosis", label: "Diagnostico" },
  { id: "unlock", label: "$49 MXN" },
  { id: "success", label: "Descarga" },
  { id: "preview", label: "Preview" },
];

const analysis: AnalysisResponse = {
  score: 82,
  qualityStatus: "yellow",
  processingMode: "RESTRUCTURE_AND_IMPROVE",
  recommendedAction: "review_before_download",
  extractionWarnings: [
    "El PDF se pudo leer, pero algunas fechas necesitan revision manual.",
    "Una seccion aparece con formato denso y se reorganizo para lectura.",
  ],
  dataIntegrityWarnings: [
    "No se agregaron empleadores, fechas ni estudios no detectados en el CV.",
  ],
  problems: [
    "El resumen inicial no comunica especialidad ni nivel con suficiente claridad.",
    "La experiencia mezcla tareas, herramientas y logros en parrafos largos.",
    "Falta una seccion de proyectos o resultados relevantes para lectura rapida.",
  ],
  missingSections: ["Perfil profesional", "Proyectos destacados", "Logros medibles"],
  recommendations: [
    "Abrir con una propuesta profesional breve y verificable.",
    "Convertir responsabilidades en bullets claros con herramientas y alcance.",
    "Agrupar habilidades por familias para que sea mas facil de revisar.",
  ],
  improvedCV: {
    name: "Mariana Lopez",
    title: "Analista de Operaciones y Datos",
    contact: "CDMX · mariana@email.com · linkedin.com/in/mariana",
    summary:
      "Profesional de operaciones con experiencia en mejora de procesos, dashboards y seguimiento de indicadores para equipos comerciales y administrativos.",
    experience: [
      {
        company: "Nexo Retail",
        role: "Analista de Operaciones",
        period: "2022 - Actualidad",
        bullets: [
          "Estructure reportes semanales para dar seguimiento a ventas, tiempos de respuesta y productividad del equipo.",
          "Coordine la limpieza de bases operativas y documente criterios para reducir retrabajo en procesos internos.",
          "Prepare presentaciones ejecutivas con hallazgos accionables para lideres de area.",
        ],
      },
      {
        company: "Grupo Delta",
        role: "Coordinadora Administrativa",
        period: "2020 - 2022",
        bullets: [
          "Ordene flujos de captura y conciliacion de informacion entre ventas, finanzas y soporte.",
          "Di seguimiento a solicitudes internas y mejore la visibilidad del avance por prioridad.",
        ],
      },
    ],
    education: [
      {
        institution: "Universidad Nacional",
        degree: "Licenciatura en Administracion",
        period: "2016 - 2020",
      },
    ],
    skills: ["Excel avanzado", "Power BI", "Analisis de datos", "Procesos", "Presentaciones ejecutivas"],
    projects: [
      {
        name: "Tablero de seguimiento comercial",
        period: "2024",
        bullets: [
          "Centralice indicadores clave en una vista semanal para facilitar revision de avance y prioridades.",
        ],
      },
    ],
    certifications: ["Google Data Analytics - en curso"],
  },
  deliveryDecision: {
    allowDownload: true,
    showWarningBeforeDownload: true,
    userMessage:
      "Tu CV mejorado esta listo, pero revisa las advertencias antes de descargar porque hubo senales de lectura parcial.",
  },
};

const statusCopy: Record<QualityStatus, { label: string; tone: string; text: string }> = {
  green: {
    label: "Listo",
    tone: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    text: "Lectura clara y estructura suficiente para preparar el PDF.",
  },
  yellow: {
    label: "Revisar",
    tone: "bg-amber-50 text-amber-700 ring-amber-200",
    text: "Hay advertencias menores. Puedes descargar despues de revisar.",
  },
  red: {
    label: "Bloqueado",
    tone: "bg-rose-50 text-rose-700 ring-rose-200",
    text: "Hace falta una mejor entrada antes de generar un documento confiable.",
  },
};

const processingModeLabel: Record<ProcessingMode, string> = {
  PRESERVE_AND_POLISH: "Pulir sin reescribir",
  RESTRUCTURE_AND_IMPROVE: "Reestructurar y mejorar",
  REVIEW_REQUIRED: "Revision requerida",
};

export default function Home() {
  const [active, setActive] = useState<ScreenId>("hero");
  const activeIndex = screens.findIndex((screen) => screen.id === active);
  const nextScreen = screens[(activeIndex + 1) % screens.length];
  const previousScreen = screens[(activeIndex - 1 + screens.length) % screens.length];

  const Screen = useMemo(() => {
    const screenMap: Record<ScreenId, ReactNode> = {
      hero: <HeroScreen onNext={() => setActive("upload")} />,
      upload: <UploadScreen onNext={() => setActive("analyzing")} />,
      analyzing: <AnalyzingScreen onNext={() => setActive("diagnosis")} />,
      diagnosis: <DiagnosisScreen onNext={() => setActive("unlock")} />,
      unlock: <UnlockScreen onNext={() => setActive("success")} />,
      success: <SuccessScreen onNext={() => setActive("preview")} />,
      preview: <PreviewScreen onNext={() => setActive("hero")} />,
    };

    return screenMap[active];
  }, [active]);

  return (
    <main className="min-h-screen overflow-hidden bg-[#f7fbff] text-[#0a1b33]">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(180deg,#ffffff_0%,#eef7ff_42%,#f9fbff_100%)]" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-[430px] flex-col px-5 pb-48 pt-5 sm:max-w-[520px]">
        <BrandHeader />

        <AnimatePresence mode="wait">
          <motion.section
            key={active}
            initial={{ opacity: 0, y: 18, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.99 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-1 flex-col"
          >
            {Screen}
          </motion.section>
        </AnimatePresence>

        <ScreenDock
          active={active}
          onSelect={setActive}
          onPrevious={() => setActive(previousScreen.id)}
          onNext={() => setActive(nextScreen.id)}
        />
      </div>
    </main>
  );
}

function BrandHeader() {
  return (
    <header className="mb-5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-lg bg-white shadow-[0_12px_30px_rgba(20,72,134,0.12)] ring-1 ring-[#d9eaff]">
          <Image
            src="/blankats-wordmark.png"
            alt="BlankATS"
            width={34}
            height={34}
            className="h-8 w-8 object-contain"
            priority
          />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#2f77d4]">
            BlankATS
          </p>
          <p className="text-xs font-medium text-[#60728d]">CV studio</p>
        </div>
      </div>
      <div className="rounded-full bg-white px-3 py-2 text-[11px] font-semibold text-[#245da8] shadow-[0_10px_24px_rgba(20,72,134,0.1)] ring-1 ring-[#d9eaff]">
        Beta
      </div>
    </header>
  );
}

function HeroScreen({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-1 flex-col justify-between">
      <div>
        <div className="mt-2 grid place-items-center">
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="grid h-28 w-28 place-items-center rounded-[28px] bg-white shadow-[0_28px_60px_rgba(22,88,171,0.18)] ring-1 ring-[#d7eaff]"
          >
            <Image
              src="/blankats-wordmark.png"
              alt="BlankATS"
              width={92}
              height={92}
              className="h-20 w-20 object-contain"
              priority
            />
          </motion.div>
        </div>

        <div className="mt-9 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#2f77d4]">
            Diagnostico + CV mejorado
          </p>
          <h1 className="mt-4 text-[42px] font-black leading-[0.94] text-[#071b35]">
            Tu CV, mas claro y profesional.
          </h1>
          <p className="mx-auto mt-5 max-w-[330px] text-[15px] leading-7 text-[#53677f]">
            Analiza estructura, legibilidad y presentacion para preparar una version
            mas facil de revisar en procesos digitales y por reclutadores.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-3 gap-2">
          <MetricPill value="PDF" label="entrada" />
          <MetricPill value="JSON" label="diagnostico" />
          <MetricPill value="PDF" label="salida" />
        </div>
      </div>

      <div className="mt-9">
        <PrimaryButton onClick={onNext} icon={<ArrowRight className="h-5 w-5" />}>
          Empezar revision
        </PrimaryButton>
        <p className="mt-4 text-center text-[12px] leading-5 text-[#72839a]">
          Sin promesas absolutas: solo estructura mas clara, presentacion cuidada
          y lectura profesional.
        </p>
      </div>
    </div>
  );
}

function UploadScreen({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-1 flex-col">
      <ScreenTitle
        eyebrow="Sube tu CV"
        title="Empecemos con tu documento actual."
        body="Usa un PDF legible o pega texto si tu archivo necesita revision manual."
      />

      <div className="mt-6 rounded-lg bg-white p-4 shadow-[0_24px_70px_rgba(30,83,148,0.13)] ring-1 ring-[#dbeafe]">
        <div className="rounded-lg border border-dashed border-[#8abdf8] bg-[#f4f9ff] px-5 py-8 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-lg bg-white text-[#2167c5] shadow-[0_14px_36px_rgba(33,103,197,0.18)]">
            <FileUp className="h-8 w-8" />
          </div>
          <h2 className="mt-5 text-xl font-extrabold text-[#0a1b33]">
            Arrastra tu PDF aqui
          </h2>
          <p className="mx-auto mt-3 max-w-[260px] text-sm leading-6 text-[#5b6f87]">
            Tambien puedes seleccionarlo desde tu telefono o computadora.
          </p>
          <button className="mt-5 rounded-lg bg-[#0b63ce] px-5 py-3 text-sm font-bold text-white shadow-[0_16px_30px_rgba(11,99,206,0.24)]">
            Seleccionar archivo
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <SoftToggle icon={<FileText className="h-4 w-4" />} label="PDF" active />
          <SoftToggle icon={<ScanLine className="h-4 w-4" />} label="Texto" />
        </div>
      </div>

      <div className="mt-4 rounded-lg bg-white p-4 shadow-[0_16px_44px_rgba(30,83,148,0.08)] ring-1 ring-[#e2efff]">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#2f77d4]">
          Archivo listo
        </p>
        <div className="mt-3 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-[#edf6ff] text-[#2167c5]">
            <FileCheck2 className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-[#132844]">CV-Mariana-Lopez.pdf</p>
            <p className="text-xs text-[#697d95]">1.8 MB · PDF detectado</p>
          </div>
          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
        </div>
      </div>

      <div className="mt-auto pt-7">
        <PrimaryButton onClick={onNext} icon={<WandSparkles className="h-5 w-5" />}>
          Analizar CV
        </PrimaryButton>
      </div>
    </div>
  );
}

function AnalyzingScreen({ onNext }: { onNext: () => void }) {
  const steps = [
    "Leyendo contenido del PDF",
    "Validando integridad de datos",
    "Reordenando estructura",
    "Preparando diagnostico",
  ];

  return (
    <div className="flex flex-1 flex-col justify-center">
      <div className="rounded-lg bg-white p-6 text-center shadow-[0_30px_80px_rgba(30,83,148,0.14)] ring-1 ring-[#dbeafe]">
        <div className="mx-auto grid h-24 w-24 place-items-center rounded-[28px] bg-[#eef7ff]">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2.6, repeat: Infinity, ease: "linear" }}
            className="grid h-16 w-16 place-items-center rounded-full border border-[#b7dcff] bg-white text-[#2167c5] shadow-[0_14px_38px_rgba(33,103,197,0.18)]"
          >
            <Sparkles className="h-7 w-7" />
          </motion.div>
        </div>
        <p className="mt-7 text-xs font-bold uppercase tracking-[0.2em] text-[#2f77d4]">
          Analizando
        </p>
        <h1 className="mt-3 text-[32px] font-black leading-tight text-[#071b35]">
          Estamos preparando una version mas clara.
        </h1>
        <div className="mt-7 h-2 overflow-hidden rounded-full bg-[#e4f0ff]">
          <motion.div
            initial={{ width: "8%" }}
            animate={{ width: "78%" }}
            transition={{ duration: 3.4, repeat: Infinity, repeatType: "reverse" }}
            className="h-full rounded-full bg-[#0b63ce]"
          />
        </div>
        <div className="mt-6 space-y-3 text-left">
          {steps.map((step, index) => (
            <div key={step} className="flex items-center gap-3">
              <div
                className={`grid h-7 w-7 place-items-center rounded-full ${
                  index < 2 ? "bg-[#0b63ce] text-white" : "bg-[#edf6ff] text-[#8aa0ba]"
                }`}
              >
                {index < 2 ? <CheckCircle2 className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
              </div>
              <p className="text-sm font-semibold text-[#27405f]">{step}</p>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={onNext}
        className="mx-auto mt-6 text-sm font-bold text-[#2167c5]"
      >
        Ver diagnostico demo
      </button>
    </div>
  );
}

function DiagnosisScreen({ onNext }: { onNext: () => void }) {
  const status = statusCopy[analysis.qualityStatus];

  return (
    <div className="flex flex-1 flex-col">
      <ScreenTitle
        eyebrow="Diagnostico"
        title="Tu CV tiene buena base, pero necesita claridad."
        body="Estos hallazgos ayudan a reorganizar el contenido sin inventar informacion."
      />

      <div className="mt-6 rounded-lg bg-white p-5 shadow-[0_24px_70px_rgba(30,83,148,0.13)] ring-1 ring-[#dbeafe]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#2f77d4]">
              Score
            </p>
            <div className="mt-2 flex items-end gap-1">
              <span className="text-6xl font-black leading-none text-[#071b35]">
                {analysis.score}
              </span>
              <span className="pb-2 text-lg font-extrabold text-[#91a1b5]">/100</span>
            </div>
          </div>
          <div className={`rounded-full px-3 py-2 text-xs font-bold ring-1 ${status.tone}`}>
            {status.label}
          </div>
        </div>

        <div className="mt-5 h-2 overflow-hidden rounded-full bg-[#e4f0ff]">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${analysis.score}%` }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="h-full rounded-full bg-[#0b63ce]"
          />
        </div>

        <p className="mt-5 text-sm leading-6 text-[#5b6f87]">{status.text}</p>
        <MetaGrid />
      </div>

      <div className="mt-4 grid gap-3">
        <InsightCard title="Problemas principales" items={analysis.problems} />
        <InsightCard title="Secciones faltantes" items={analysis.missingSections} compact />
        <InsightCard title="Recomendaciones" items={analysis.recommendations} />
      </div>

      <div className="mt-auto pt-7">
        <PrimaryButton onClick={onNext} icon={<LockKeyhole className="h-5 w-5" />}>
          Ver oferta de desbloqueo
        </PrimaryButton>
      </div>
    </div>
  );
}

function UnlockScreen({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-1 flex-col justify-center">
      <div className="rounded-lg bg-[#071b35] p-6 text-white shadow-[0_30px_90px_rgba(7,27,53,0.22)]">
        <div className="grid h-14 w-14 place-items-center rounded-lg bg-white/10 text-[#9fd0ff] ring-1 ring-white/15">
          <LockKeyhole className="h-7 w-7" />
        </div>
        <p className="mt-7 text-xs font-bold uppercase tracking-[0.2em] text-[#9fd0ff]">
          Desbloqueo
        </p>
        <h1 className="mt-3 text-[34px] font-black leading-[1.02]">
          PDF mejorado listo por $49 MXN.
        </h1>
        <p className="mt-4 text-sm leading-6 text-[#c6d6e8]">
          Incluye una version reorganizada, mas clara y con formato profesional
          para revisar antes de usarla en tus procesos.
        </p>

        <div className="mt-6 rounded-lg bg-white p-4 text-[#0a1b33]">
          {["Diagnostico visual", "Preview antes/despues", "PDF mejorado descargable"].map(
            (item) => (
              <div key={item} className="flex items-center gap-3 py-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                <p className="text-sm font-bold">{item}</p>
              </div>
            ),
          )}
        </div>

        <button
          onClick={onNext}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-white px-5 py-4 text-base font-black text-[#0b63ce] shadow-[0_16px_36px_rgba(255,255,255,0.16)]"
        >
          Simular desbloqueo
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>
      <p className="mx-auto mt-5 max-w-[310px] text-center text-xs leading-5 text-[#72839a]">
        Esta pantalla es solo visual. No se agregan pagos ni flujo de checkout en esta fase.
      </p>
    </div>
  );
}

function SuccessScreen({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-1 flex-col justify-center">
      <div className="rounded-lg bg-white p-6 text-center shadow-[0_30px_80px_rgba(30,83,148,0.14)] ring-1 ring-[#dbeafe]">
        <div className="mx-auto grid h-24 w-24 place-items-center rounded-[28px] bg-emerald-50 text-emerald-600">
          <ShieldCheck className="h-11 w-11" />
        </div>
        <p className="mt-7 text-xs font-bold uppercase tracking-[0.2em] text-[#2f77d4]">
          Descarga lista
        </p>
        <h1 className="mt-3 text-[34px] font-black leading-tight text-[#071b35]">
          Tu CV mejorado esta preparado.
        </h1>
        <p className="mt-4 text-sm leading-6 text-[#5b6f87]">
          Revisa la advertencia de calidad y descarga si el contenido refleja tu experiencia real.
        </p>

        <div className="mt-6 rounded-lg bg-amber-50 p-4 text-left ring-1 ring-amber-200">
          <p className="text-sm font-extrabold text-amber-800">Advertencia antes de descargar</p>
          <p className="mt-2 text-sm leading-6 text-amber-700">
            {analysis.deliveryDecision.userMessage}
          </p>
        </div>

        <button
          onClick={onNext}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-[#0b63ce] px-5 py-4 text-base font-black text-white shadow-[0_18px_36px_rgba(11,99,206,0.24)]"
        >
          <Download className="h-5 w-5" />
          Descargar PDF
        </button>
      </div>
    </div>
  );
}

function PreviewScreen({ onNext }: { onNext: () => void }) {
  const cv = analysis.improvedCV;

  return (
    <div className="flex flex-1 flex-col">
      <ScreenTitle
        eyebrow="Preview"
        title="Antes y despues, sin perder datos reales."
        body="La mejora visual se concentra en claridad, orden y lectura profesional."
      />

      <div className="mt-6 grid gap-4">
        <PreviewCard
          label="Antes"
          muted
          title="Parrafos densos"
          body="Responsabilidades mezcladas, habilidades sin agrupacion y logros poco visibles para una revision rapida."
        />
        <div className="rounded-lg bg-white p-5 shadow-[0_24px_70px_rgba(30,83,148,0.13)] ring-1 ring-[#dbeafe]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#2f77d4]">
                Despues
              </p>
              <h2 className="mt-2 text-2xl font-black text-[#071b35]">{cv.name}</h2>
              <p className="mt-1 text-sm font-bold text-[#2167c5]">{cv.title}</p>
            </div>
            <div className="rounded-full bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
              Claro
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-[#51677f]">{cv.summary}</p>

          <div className="mt-5 space-y-5">
            {cv.experience.map((job) => (
              <div key={`${job.company}-${job.role}`} className="border-t border-[#e6f0fb] pt-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-black text-[#0a1b33]">{job.role}</h3>
                    <p className="text-xs font-bold text-[#2167c5]">{job.company}</p>
                  </div>
                  <p className="text-right text-[11px] font-bold text-[#7c8da2]">{job.period}</p>
                </div>
                <ul className="mt-3 space-y-2">
                  {job.bullets.map((bullet) => (
                    <li key={bullet} className="flex gap-2 text-sm leading-6 text-[#4f647c]">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0b63ce]" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {cv.skills.map((skill) => (
              <span
                key={skill}
                className="rounded-full bg-[#edf6ff] px-3 py-2 text-xs font-bold text-[#245da8]"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-auto pt-7">
        <PrimaryButton onClick={onNext} icon={<ArrowRight className="h-5 w-5" />}>
          Volver al inicio
        </PrimaryButton>
      </div>
    </div>
  );
}

function ScreenTitle({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#2f77d4]">{eyebrow}</p>
      <h1 className="mt-3 text-[34px] font-black leading-[1.02] text-[#071b35]">{title}</h1>
      <p className="mt-4 text-[15px] leading-7 text-[#53677f]">{body}</p>
    </div>
  );
}

function PrimaryButton({
  children,
  onClick,
  icon,
}: {
  children: ReactNode;
  onClick: () => void;
  icon: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#0b63ce] px-5 py-4 text-base font-black text-white shadow-[0_18px_36px_rgba(11,99,206,0.24)] transition hover:-translate-y-0.5 hover:bg-[#0959bd] active:translate-y-0"
    >
      {children}
      {icon}
    </button>
  );
}

function MetricPill({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-lg bg-white px-3 py-4 text-center shadow-[0_12px_30px_rgba(30,83,148,0.08)] ring-1 ring-[#e0efff]">
      <p className="text-lg font-black text-[#0b63ce]">{value}</p>
      <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#7f8fa4]">
        {label}
      </p>
    </div>
  );
}

function SoftToggle({
  icon,
  label,
  active = false,
}: {
  icon: ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      className={`flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-bold ring-1 ${
        active
          ? "bg-[#0b63ce] text-white ring-[#0b63ce]"
          : "bg-[#f4f9ff] text-[#53677f] ring-[#dbeafe]"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function MetaGrid() {
  return (
    <div className="mt-5 grid gap-2">
      <MetaRow label="qualityStatus" value={analysis.qualityStatus} />
      <MetaRow label="processingMode" value={processingModeLabel[analysis.processingMode]} />
      <MetaRow label="recommendedAction" value={analysis.recommendedAction} />
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-[#f5f9ff] px-3 py-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#7890aa]">{label}</p>
      <p className="text-right text-xs font-black text-[#1f5faa]">{value}</p>
    </div>
  );
}

function InsightCard({
  title,
  items,
  compact = false,
}: {
  title: string;
  items: string[];
  compact?: boolean;
}) {
  return (
    <div className="rounded-lg bg-white p-4 shadow-[0_16px_44px_rgba(30,83,148,0.08)] ring-1 ring-[#e2efff]">
      <h2 className="text-sm font-black text-[#0a1b33]">{title}</h2>
      <ul className={`mt-3 ${compact ? "flex flex-wrap gap-2" : "space-y-3"}`}>
        {items.map((item) =>
          compact ? (
            <li
              key={item}
              className="rounded-full bg-[#edf6ff] px-3 py-2 text-xs font-bold text-[#245da8]"
            >
              {item}
            </li>
          ) : (
            <li key={item} className="flex gap-3 text-sm leading-6 text-[#51677f]">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0b63ce]" />
              <span>{item}</span>
            </li>
          ),
        )}
      </ul>
    </div>
  );
}

function PreviewCard({
  label,
  title,
  body,
  muted = false,
}: {
  label: string;
  title: string;
  body: string;
  muted?: boolean;
}) {
  return (
    <div
      className={`rounded-lg p-5 ring-1 ${
        muted
          ? "bg-[#f3f6fa] text-[#61738a] ring-[#dde7f2]"
          : "bg-white text-[#0a1b33] ring-[#dbeafe]"
      }`}
    >
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#7c8da2]">{label}</p>
      <h2 className="mt-2 text-xl font-black">{title}</h2>
      <p className="mt-3 text-sm leading-6">{body}</p>
    </div>
  );
}

function ScreenDock({
  active,
  onSelect,
  onPrevious,
  onNext,
}: {
  active: ScreenId;
  onSelect: (screen: ScreenId) => void;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-[430px] border-t border-[#dbeafe] bg-white/92 px-4 pb-4 pt-3 shadow-[0_-16px_40px_rgba(30,83,148,0.1)] backdrop-blur sm:max-w-[520px]">
      <div className="mb-3 flex items-center justify-between">
        <button
          onClick={onPrevious}
          className="grid h-10 w-10 place-items-center rounded-full bg-[#f1f7ff] text-[#245da8]"
          aria-label="Pantalla anterior"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#7890aa]">
          Vista visual
        </p>
        <button
          onClick={onNext}
          className="grid h-10 w-10 place-items-center rounded-full bg-[#0b63ce] text-white"
          aria-label="Pantalla siguiente"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {screens.map((screen) => (
          <button
            key={screen.id}
            onClick={() => onSelect(screen.id)}
            className={`shrink-0 rounded-full px-3 py-2 text-[11px] font-black transition ${
              active === screen.id
                ? "bg-[#0b63ce] text-white"
                : "bg-[#f1f7ff] text-[#6b7f98]"
            }`}
          >
            {screen.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
