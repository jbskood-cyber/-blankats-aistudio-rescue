"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { useState } from "react";
import { motion } from "motion/react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  ClipboardList,
  Download,
  Eye,
  FileBadge2,
  FileCheck2,
  FileText,
  Infinity,
  Info,
  LayoutTemplate,
  ListChecks,
  Lock,
  Mail,
  PenLine,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  Upload,
  Zap,
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
  }[];
  education: {
    institution: string;
    degree: string;
    period: string;
  }[];
  skills: string[];
  projects?: {
    name: string;
    bullets: string[];
    period?: string;
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

type Screen = "home" | "upload" | "analyzing" | "diagnosis" | "unlock" | "success";

const demoAnalysis: AnalysisResponse = {
  score: 78,
  qualityStatus: "yellow",
  processingMode: "RESTRUCTURE_AND_IMPROVE",
  recommendedAction: "review_before_download",
  extractionWarnings: ["El archivo se pudo leer, pero algunas secciones necesitan revisión."],
  dataIntegrityWarnings: ["No se agregaron datos no detectados en el CV original."],
  problems: [
    "Faltan palabras clave relevantes",
    "Formato menos compatible con ATS",
    "Sección de resumen ausente",
    "Poca cuantificación de logros",
  ],
  missingSections: ["Resumen"],
  recommendations: [
    "Mejora el resumen",
    "Cuantifica tus logros",
    "Optimiza palabras clave",
  ],
  improvedCV: {
    name: "María López",
    title: "Diseñadora UX/UI",
    contact: "CDMX, México · maria@email.com · 55 1234 5678",
    summary:
      "Diseñadora UX/UI enfocada en crear experiencias digitales intuitivas y centradas en el usuario.",
    experience: [
      {
        company: "Empresa Digital",
        role: "Diseñadora UX/UI Senior",
        period: "2021 - Actualidad",
        bullets: [
          "Diseñé interfaces centradas en el usuario que mejoraron la conversión en 25%.",
          "Colaboré con equipos de producto y desarrollo para entregar soluciones de alto impacto.",
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
    skills: ["Research", "Diseño UI", "Prototipos", "Figma", "Sistemas visuales"],
    projects: [
      {
        name: "Rediseño de onboarding",
        period: "2024",
        bullets: ["Simplificó la lectura del perfil y el flujo de postulación."],
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

export default function Home() {
  const [screen, setScreen] = useState<Screen>("home");

  return (
    <main className="min-h-screen bg-white text-[#070b2f]">
      <div className="mx-auto min-h-screen w-full max-w-[480px] overflow-hidden bg-white shadow-[0_0_0_1px_rgba(5,15,45,0.04)]">
        {screen === "home" ? <HomeScreen onGo={setScreen} /> : null}
        {screen === "upload" ? <UploadScreen onGo={setScreen} /> : null}
        {screen === "analyzing" ? <AnalyzingScreen onGo={setScreen} /> : null}
        {screen === "diagnosis" ? <DiagnosisScreen onGo={setScreen} /> : null}
        {screen === "unlock" ? <UnlockScreen onGo={setScreen} /> : null}
        {screen === "success" ? <SuccessScreen onGo={setScreen} /> : null}
      </div>
    </main>
  );
}

function HomeScreen({ onGo }: { onGo: (screen: Screen) => void }) {
  return (
    <ScreenShell
      header={<TopHeader action="Iniciar sesión" />}
      className="pb-5"
    >
      <section className="px-10 pt-8 text-center">
        <Pill icon={<Sparkles className="h-4 w-4" />}>Análisis ATS inteligente</Pill>
        <h1 className="mt-4 text-[41px] font-black leading-[0.98] tracking-[-0.02em] text-[#070b2f]">
          Mejora tu CV <span className="block text-[#0068ff]">antes de enviarlo</span>
        </h1>
        <p className="mx-auto mt-4 max-w-[320px] text-[16px] font-medium leading-7 text-[#626a79]">
          Recibe un diagnóstico gratuito y desbloquea una versión profesional lista para aplicar.
        </p>
        <div className="mt-7 space-y-3">
          <PrimaryButton onClick={() => onGo("upload")}>Analizar mi CV gratis</PrimaryButton>
          <OutlineButton onClick={() => onGo("upload")}>Ver cómo funciona</OutlineButton>
        </div>
      </section>

      <section className="px-8 pt-6">
        <DiagnosticSummaryCard />
      </section>

      <section className="px-8 pt-5 text-center">
        <h2 className="text-[25px] font-black text-[#070b2f]">Cómo funciona</h2>
        <div className="mt-5 grid grid-cols-3 items-start gap-3">
          <StepItem icon={<Upload className="h-7 w-7" />} number="1" title="Sube tu CV">
            PDF o DOCX. Rápido, seguro y confidencial.
          </StepItem>
          <StepItem icon={<Search className="h-8 w-8" />} number="2" title="Recibe diagnóstico">
            Análisis ATS inteligente con puntuación y tips.
          </StepItem>
          <StepItem icon={<Sparkles className="h-7 w-7" />} number="3" title="Desbloquea versión mejorada">
            Obtén tu CV optimizado y listo para aplicar.
          </StepItem>
        </div>
      </section>

      <section className="px-8 pt-6">
        <LaunchOffer compact onClick={() => onGo("unlock")} />
      </section>

      <ProtectedFooter className="mt-4" />
    </ScreenShell>
  );
}

function UploadScreen({ onGo }: { onGo: (screen: Screen) => void }) {
  return (
    <ScreenShell
      header={<TopHeader left="back" onBack={() => onGo("home")} />}
      className="pb-6"
    >
      <section className="px-8 pt-8 text-center">
        <h1 className="text-[45px] font-black leading-none tracking-[-0.03em]">
          Sube tu <span className="text-[#0068ff]">CV</span>
        </h1>
        <p className="mx-auto mt-4 max-w-[320px] text-[20px] font-medium leading-8 text-[#5f6673]">
          Carga tu archivo PDF para recibir un diagnóstico gratuito.
        </p>
      </section>

      <section className="px-8 pt-7">
        <button
          onClick={() => onGo("analyzing")}
          className="w-full rounded-lg border-2 border-dashed border-[#b8cce4] bg-[#fbfdff] px-6 py-11 text-center"
        >
          <div className="mx-auto grid h-24 w-24 place-items-center">
            <PdfDocumentIcon large />
          </div>
          <p className="mt-5 text-[20px] font-black text-[#070b2f]">
            Arrastra y suelta tu CV aquí
          </p>
          <p className="mt-2 text-[17px] font-medium text-[#6f7682]">
            o haz clic para seleccionar tu archivo
          </p>
        </button>

        <button
          onClick={() => onGo("analyzing")}
          className="mt-5 flex h-14 w-full items-center justify-center gap-4 rounded-lg border border-[#0c66d8] bg-white text-[20px] font-black text-[#0c66d8]"
        >
          <Upload className="h-6 w-6" />
          Seleccionar PDF
        </button>
        <p className="mt-3 text-center text-[16px] font-medium text-[#6a7280]">
          Solo PDF · Máx. 10 MB
        </p>

        <div className="mt-5 flex items-start gap-4 rounded-lg border border-[#dce5f0] bg-[#fbfdff] p-4">
          <ShieldCheck className="mt-1 h-8 w-8 shrink-0 text-[#0068ff]" />
          <p className="text-[15px] font-medium leading-7 text-[#5f6673]">
            <span className="font-black text-[#070b2f]">Tus datos están protegidos.</span>{" "}
            No compartimos tu información con terceros ni hacemos públicas tus evaluaciones.
          </p>
        </div>

        <label className="mt-6 block text-left text-[18px] font-black text-[#070b2f]">
          Tu correo
        </label>
        <div className="mt-3 flex h-16 items-center gap-4 rounded-lg border border-[#d6dce5] px-5">
          <Mail className="h-6 w-6 text-[#8a929f]" />
          <span className="text-[18px] font-medium text-[#8a929f]">nombre@correo.com</span>
        </div>
        <p className="mt-3 text-[15px] font-medium leading-6 text-[#6a7280]">
          Te enviaremos tu diagnóstico y tu CV mejorado a este correo.
        </p>

        <div className="mt-7">
          <PrimaryButton onClick={() => onGo("analyzing")}>Analizar mi CV gratis</PrimaryButton>
        </div>
        <div className="mt-5 flex items-center justify-center gap-2 text-[#6a7280]">
          <ShieldCheck className="h-6 w-6 text-[#0068ff]" />
          <span className="text-[15px] font-medium">Pago seguro</span>
        </div>
      </section>
    </ScreenShell>
  );
}

function AnalyzingScreen({ onGo }: { onGo: (screen: Screen) => void }) {
  return (
    <ScreenShell
      header={<TopHeader action="Iniciar sesión" />}
      className="pb-4"
    >
      <section className="px-8 pt-8 text-center">
        <Pill icon={<Sparkles className="h-4 w-4" />}>Análisis ATS inteligente</Pill>
        <h1 className="mt-5 text-[40px] font-black leading-none tracking-[-0.025em]">
          Analizando tu <span className="text-[#0068ff]">CV</span>
        </h1>
        <p className="mx-auto mt-4 max-w-[330px] text-[16px] font-medium leading-7 text-[#626a79]">
          Estamos revisando estructura, claridad y formato.
        </p>
      </section>

      <section className="px-8 pt-7">
        <ProgressRing percent={72} label="Analizando..." size="large" />
      </section>

      <section className="px-8 pt-5">
        <div className="flex items-center gap-4 rounded-lg border border-[#e0e5ec] bg-white p-4 shadow-[0_8px_24px_rgba(15,25,55,0.06)]">
          <PdfDocumentIcon />
          <div className="flex-1">
            <p className="text-[19px] font-black text-[#070b2f]">mi-cv.pdf</p>
            <p className="text-[15px] font-medium text-[#6f7682]">Archivo cargado</p>
          </div>
          <CheckCircle2 className="h-8 w-8 text-[#12b861]" />
        </div>

        <div className="mt-5 overflow-hidden rounded-lg border border-[#e0e5ec] bg-white shadow-[0_8px_24px_rgba(15,25,55,0.05)]">
          <AnalyzeRow index="1" text="Extrayendo contenido" done />
          <AnalyzeRow index="2" text="Detectando secciones" done />
          <AnalyzeRow index="3" text="Evaluando claridad" active />
          <AnalyzeRow index="4" text="Optimizando recomendaciones" />
        </div>

        <button
          onClick={() => onGo("diagnosis")}
          className="mx-auto mt-5 flex items-center justify-center gap-3 text-[15px] font-medium text-[#667080]"
        >
          <span className="grid h-7 w-7 place-items-center rounded-full border border-[#0068ff] text-[#0068ff]">
            <span className="h-3 w-3 rounded-full border-2 border-current border-t-transparent" />
          </span>
          Esto tarda menos de 1 minuto
        </button>
      </section>

      <section className="px-5 pt-7">
        <div className="rounded-lg border border-[#e0e5ec] bg-white p-4">
          <h2 className="text-center text-[22px] font-black">¿Qué estamos evaluando?</h2>
          <div className="mt-5 grid grid-cols-3 gap-3">
            <EvalCard icon={<FileText className="h-7 w-7" />} title="Formato">
              Verificamos estructura, orden y compatibilidad ATS.
            </EvalCard>
            <EvalCard icon={<ListChecks className="h-7 w-7" />} title="Contenido">
              Analizamos claridad, relevancia y uso de palabras clave.
            </EvalCard>
            <EvalCard icon={<Target className="h-7 w-7" />} title="Impacto">
              Evaluamos el potencial de tu CV para captar la atención.
            </EvalCard>
          </div>
        </div>
      </section>
    </ScreenShell>
  );
}

function DiagnosisScreen({ onGo }: { onGo: (screen: Screen) => void }) {
  return (
    <ScreenShell
      header={<TopHeader left="chevron" right="share" onBack={() => onGo("upload")} />}
      className="pb-4"
    >
      <section className="px-8 pt-5 text-center">
        <Pill icon={<Sparkles className="h-4 w-4" />}>Diagnóstico ATS gratuito</Pill>
        <h1 className="mt-4 text-[38px] font-black leading-none tracking-[-0.02em]">
          Tu diagnóstico
        </h1>
        <p className="mt-3 text-[17px] font-medium text-[#626a79]">
          Detectamos oportunidades de mejora en tu CV.
        </p>
      </section>

      <section className="px-7 pt-5">
        <div className="rounded-lg border border-[#e0e5ec] bg-white p-5 shadow-[0_8px_26px_rgba(15,25,55,0.05)]">
          <div className="grid grid-cols-[140px_1fr] items-center gap-5">
            <ProgressRing percent={78} score />
            <div className="text-left">
              <h2 className="text-[24px] font-black leading-tight text-[#0068ff]">
                Buen potencial,
              </h2>
              <p className="mt-1 text-[18px] font-medium leading-7 text-[#070b2f]">
                pero hay problemas que pueden afectar tu presentación.
              </p>
            </div>
          </div>

          <NumberedPanel title="Problemas detectados" number="1">
            <ProblemRow icon="alert" label="Faltan palabras clave relevantes" severity="Alto" tone="red" />
            <ProblemRow icon="warning" label="Formato menos compatible con ATS" severity="Medio" tone="amber" />
            <ProblemRow icon="info" label="Sección de resumen ausente" severity="Alto" tone="red" />
            <ProblemRow icon="info" label="Poca cuantificación de logros" severity="Bajo" tone="blue" />
          </NumberedPanel>

          <NumberedPanel title="Secciones detectadas" number="2">
            <div className="flex flex-wrap gap-2">
              <StatusChip ok>Experiencia</StatusChip>
              <StatusChip ok>Educación</StatusChip>
              <StatusChip ok>Habilidades</StatusChip>
              <StatusChip warning>Falta: Resumen</StatusChip>
            </div>
          </NumberedPanel>

          <NumberedPanel title="Recomendaciones clave" number="3">
            <div className="grid grid-cols-3 gap-3">
              <RecommendationCard icon={<ClipboardList className="h-6 w-6" />} title="Mejora el resumen">
                Añade un resumen profesional claro y orientado a resultados.
              </RecommendationCard>
              <RecommendationCard icon={<BarChart3 className="h-6 w-6" />} title="Cuantifica tus logros">
                Incluye métricas para demostrar tu impacto.
              </RecommendationCard>
              <RecommendationCard icon={<Search className="h-6 w-6" />} title="Optimiza palabras clave">
                Usa keywords relevantes de la oferta laboral.
              </RecommendationCard>
            </div>
          </NumberedPanel>

          <div className="mt-4">
            <div className="mb-3 flex items-center gap-3">
              <h2 className="text-[18px] font-black">Versión mejorada</h2>
              <span className="inline-flex items-center gap-1 rounded-full border border-[#b8cce4] px-3 py-1 text-xs font-bold text-[#0c66d8]">
                <Lock className="h-3 w-3" /> Vista previa
              </span>
            </div>
            <LockedPreview />
          </div>

          <div className="mt-5">
            <PrimaryButton icon={<Lock className="h-6 w-6" />} onClick={() => onGo("unlock")}>
              Desbloquear mi CV mejorado
            </PrimaryButton>
          </div>

          <div className="mt-5 grid grid-cols-3 divide-x divide-[#e6ebf2] text-center text-[14px] font-medium text-[#6a7280]">
            <TrustItem icon={<ShieldCheck className="h-7 w-7" />}>Pago único</TrustItem>
            <TrustItem icon={<Infinity className="h-7 w-7" />}>Acceso ilimitado</TrustItem>
            <TrustItem icon={<Lock className="h-7 w-7" />}>Pago seguro</TrustItem>
          </div>
        </div>
      </section>
    </ScreenShell>
  );
}

function UnlockScreen({ onGo }: { onGo: (screen: Screen) => void }) {
  return (
    <ScreenShell
      header={<TopHeader action="Iniciar sesión" />}
      className="pb-5"
    >
      <section className="px-8 pt-7 text-center">
        <h1 className="text-[43px] font-black leading-[1.02] tracking-[-0.03em]">
          Desbloquea tu <br />
          CV <span className="text-[#0068ff]">mejorado</span>
        </h1>
        <p className="mx-auto mt-4 max-w-[320px] text-[18px] font-medium leading-7 text-[#626a79]">
          Obtén una versión más clara, profesional y lista para enviar.
        </p>
      </section>

      <section className="px-7 pt-6">
        <BeforeAfterPreview />
      </section>

      <section className="px-7 pt-5">
        <div className="grid grid-cols-5 gap-2 rounded-lg border border-[#e0e5ec] bg-white px-3 py-4 shadow-[0_8px_26px_rgba(15,25,55,0.06)]">
          <BenefitIcon icon={<ClipboardList className="h-7 w-7" />}>Estructura más clara</BenefitIcon>
          <BenefitIcon icon={<PenLine className="h-7 w-7" />}>Redacción profesional</BenefitIcon>
          <BenefitIcon icon={<Eye className="h-7 w-7" />}>Mejor legibilidad</BenefitIcon>
          <BenefitIcon icon={<FileCheck2 className="h-7 w-7" />}>PDF listo para descargar</BenefitIcon>
          <BenefitIcon icon={<Send className="h-7 w-7" />}>Envío por correo</BenefitIcon>
        </div>
      </section>

      <section className="px-7 pt-5">
        <div className="rounded-lg border border-[#cbdbea] bg-[#fbfdff] p-4 shadow-[0_8px_26px_rgba(15,25,55,0.05)]">
          <div className="grid grid-cols-[92px_1fr_auto] items-center gap-3">
            <div className="grid h-20 w-20 place-items-center rounded-full border border-[#7fb4f7] bg-white text-center text-[13px] font-black leading-4 text-[#0c66d8]">
              Oferta de lanzamiento
            </div>
            <div>
              <div className="flex items-end gap-2">
                <span className="text-[47px] font-black leading-none text-[#070b2f]">$49</span>
                <span className="pb-2 text-[18px] font-black text-[#0068ff]">MXN</span>
              </div>
              <p className="mt-1 text-[14px] font-medium text-[#6a7280]">
                Pago único · Sin cargos ocultos
              </p>
            </div>
            <span className="text-[19px] font-bold text-[#666] line-through">$99 MXN</span>
          </div>

          <div className="mt-5 space-y-3">
            <InputLike icon={<Mail className="h-6 w-6" />}>Correo electrónico</InputLike>
            <InputLike icon={<span className="text-[24px] text-[#0bbb54]">◔</span>} subtext="Te enviaremos tu CV a este número">
              WhatsApp (opcional)
            </InputLike>
          </div>

          <div className="mt-5 grid grid-cols-3 divide-x divide-[#dfe6ef]">
            <MiniGuarantee icon={<ShieldCheck className="h-9 w-9" />} title="Pago seguro">
              Tus datos están protegidos
            </MiniGuarantee>
            <MiniGuarantee icon={<Circle className="h-9 w-9" />} title="Sin suscripción">
              Pago único, sin renovaciones
            </MiniGuarantee>
            <MiniGuarantee icon={<Zap className="h-9 w-9" />} title="Entrega inmediata">
              Recibe tu CV al instante
            </MiniGuarantee>
          </div>
        </div>

        <div className="mt-5">
          <PrimaryButton onClick={() => onGo("success")}>Pagar y generar mi CV</PrimaryButton>
        </div>
        <ProtectedFooter className="mt-4" />
      </section>
    </ScreenShell>
  );
}

function SuccessScreen({ onGo }: { onGo: (screen: Screen) => void }) {
  return (
    <ScreenShell
      header={<TopHeader action="Ir al inicio" onAction={() => onGo("home")} />}
      className="pb-5"
    >
      <section className="px-8 pt-8 text-center">
        <div className="mx-auto relative grid h-24 w-24 place-items-center rounded-full bg-[#dff8ec]">
          <Check className="h-12 w-12 text-[#10b85f]" strokeWidth={5} />
          <span className="absolute -left-5 top-8 h-2 w-2 rounded-full bg-[#11bd65]" />
          <span className="absolute -right-5 top-9 h-2 w-2 rounded-full bg-[#0068ff]" />
          <span className="absolute right-2 -top-1 h-1.5 w-1.5 rounded-full bg-[#54d9b7]" />
        </div>
        <h1 className="mt-6 text-[38px] font-black leading-none tracking-[-0.02em]">
          ¡Tu CV está listo!
        </h1>
        <p className="mt-4 text-[17px] font-medium text-[#626a79]">
          Hemos generado tu versión mejorada.
        </p>
      </section>

      <section className="px-8 pt-6">
        <div className="rounded-lg border border-[#e0e5ec] bg-white p-5 shadow-[0_8px_26px_rgba(15,25,55,0.06)]">
          <div className="flex items-center gap-5">
            <PdfDocumentIcon />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[20px] font-black">CV_Josue_Bravo_BlankATS.pdf</p>
              <span className="mt-2 inline-flex items-center gap-2 rounded-full bg-[#dff8ec] px-3 py-1 text-[13px] font-black text-[#139b55]">
                <CheckCircle2 className="h-4 w-4" /> Generado
              </span>
            </div>
          </div>
          <div className="mt-5 flex gap-8 border-t border-[#e5eaf1] pt-4 text-[15px] font-medium text-[#6a7280]">
            <span className="inline-flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-[#0c66d8]" /> Creado hoy
            </span>
            <span className="inline-flex items-center gap-2">
              <FileText className="h-5 w-5" /> 2 páginas
            </span>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          <PrimaryButton icon={<Download className="h-6 w-6" />} onClick={() => undefined}>
            Descargar PDF
          </PrimaryButton>
          <OutlineButton icon={<Mail className="h-6 w-6" />} onClick={() => undefined}>
            Enviar de nuevo por correo
          </OutlineButton>
        </div>
        <p className="mt-4 text-center text-[15px] font-medium text-[#6a7280]">
          También enviamos una copia a <span className="font-black text-[#0c66d8]">nombre@correo.com</span>
        </p>
      </section>

      <section className="px-8 pt-6">
        <h2 className="text-center text-[24px] font-black">Qué mejoramos</h2>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <ImprovedCard icon={<FileBadge2 className="h-8 w-8" />} title="Resumen optimizado">
            Reescribimos tu perfil para hacerlo más claro, impactante y relevante.
          </ImprovedCard>
          <ImprovedCard icon={<BarChart3 className="h-8 w-8" />} title="Logros reforzados" tone="green">
            Destacamos tus resultados con métricas y verbos de alto impacto.
          </ImprovedCard>
          <ImprovedCard icon={<LayoutTemplate className="h-8 w-8" />} title="Formato limpio" tone="purple">
            Diseño profesional, escaneable y optimizado para los ATS.
          </ImprovedCard>
        </div>

        <div className="mt-5 flex items-center gap-4 rounded-lg border border-[#e0e5ec] bg-white p-4 shadow-[0_8px_24px_rgba(15,25,55,0.05)]">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[#edf5ff] text-[#0068ff]">
            <span className="text-3xl">☊</span>
          </div>
          <div className="flex-1">
            <p className="text-[18px] font-black">¿Necesitas ayuda?</p>
            <p className="text-[15px] font-medium text-[#6a7280]">
              Nuestro equipo está listo para apoyarte.
            </p>
          </div>
          <ChevronRight className="h-7 w-7 text-[#0c66d8]" />
        </div>
        <ProtectedFooter className="mt-5" />
      </section>
    </ScreenShell>
  );
}

function ScreenShell({
  header,
  children,
  className = "",
}: {
  header: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24 }}
      className={`min-h-screen bg-white ${className}`}
    >
      {header}
      {children}
    </motion.div>
  );
}

function TopHeader({
  action,
  onAction,
  left,
  right,
  onBack,
}: {
  action?: string;
  onAction?: () => void;
  left?: "back" | "chevron";
  right?: "share";
  onBack?: () => void;
}) {
  return (
    <header className="flex h-[66px] items-center justify-between border-b border-[#eceff3] px-8">
      <div className="flex items-center gap-3">
        {left ? (
          <button
            onClick={onBack}
            className="mr-3 grid h-11 w-11 place-items-center rounded-lg border border-[#e1e5eb] bg-white text-[#070b2f]"
            aria-label="Volver"
          >
            <ArrowLeft className="h-7 w-7" />
          </button>
        ) : null}
        {left === "chevron" ? null : <BrandMark />}
      </div>

      {left === "chevron" ? (
        <div className="absolute left-1/2 flex -translate-x-1/2 items-center">
          <BrandMark centered />
        </div>
      ) : null}

      {action ? (
        <button
          onClick={onAction}
          className="rounded-lg border border-[#e0e5ec] bg-white px-5 py-3 text-[15px] font-black text-[#0c55b8] shadow-[0_4px_12px_rgba(10,20,50,0.05)]"
        >
          {action}
        </button>
      ) : null}
      {right === "share" ? (
        <button className="grid h-11 w-11 place-items-center rounded-lg border border-[#e1e5eb] bg-white text-[#0c66d8]">
          <Upload className="h-6 w-6" />
        </button>
      ) : null}
    </header>
  );
}

function BrandMark({ centered = false }: { centered?: boolean }) {
  return (
    <div className={`flex items-center gap-3 ${centered ? "scale-95" : ""}`}>
      <Image
        src="/blankats-wordmark.png"
        alt="BlankATS"
        width={235}
        height={70}
        priority
        className="h-11 w-auto object-contain"
      />
    </div>
  );
}

function Pill({ children, icon }: { children: ReactNode; icon: ReactNode }) {
  return (
    <div className="mx-auto inline-flex items-center gap-2 rounded-full bg-[#edf5ff] px-4 py-2 text-[14px] font-black text-[#0c55b8] shadow-inner">
      <span className="text-[#0068ff]">{icon}</span>
      {children}
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
  icon?: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="flex h-16 w-full items-center justify-center gap-4 rounded-lg bg-[#0068ff] px-6 text-[20px] font-black text-white shadow-[0_10px_24px_rgba(0,104,255,0.25)]"
    >
      {icon}
      {children}
      <ArrowRight className="h-7 w-7" />
    </button>
  );
}

function OutlineButton({
  children,
  onClick,
  icon,
}: {
  children: ReactNode;
  onClick: () => void;
  icon?: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="flex h-14 w-full items-center justify-center gap-4 rounded-lg border border-[#0c66d8] bg-white px-6 text-[17px] font-black text-[#0c55b8]"
    >
      {icon}
      {children}
      {!icon ? <span className="text-[#0068ff]">▶</span> : null}
    </button>
  );
}

function DiagnosticSummaryCard() {
  return (
    <div className="rounded-lg border border-[#e0e5ec] bg-white p-4 text-left shadow-[0_10px_30px_rgba(15,25,55,0.07)]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-lg bg-[#edf5ff] text-[#0068ff]">
            <FileText className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-[16px] font-black">Diagnóstico de tu CV</h2>
            <p className="text-[12px] font-medium text-[#606a7a]">Analizado hoy · Versión actual</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-[#e9f9f0] px-3 py-2 text-[12px] font-black text-[#19a65b]">
          <CheckCircle2 className="h-4 w-4" /> Análisis completado
        </span>
      </div>
      <div className="mt-4 grid grid-cols-[110px_1fr] gap-4">
        <div className="text-center">
          <ProgressRing percent={78} score compact />
          <p className="mt-3 text-[14px] font-black">Puntuación ATS</p>
          <p className="mt-1 text-[13px] font-bold text-[#0c66d8]">Buen potencial</p>
        </div>
        <div className="rounded-lg border border-[#e9edf3] p-3">
          <h3 className="text-[12px] font-black">Problemas detectados</h3>
          <TinyProblem text="Faltan palabras clave relevantes" count="6" tone="red" />
          <TinyProblem text="Formato menos compatible" count="3" tone="amber" />
          <TinyProblem text="Secciones mejorables" count="2" tone="blue" />
        </div>
      </div>
      <div className="mt-4">
        <h3 className="text-[12px] font-black">Recomendaciones clave</h3>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <MiniPill icon={<Target className="h-4 w-4" />}>Añadir logros cuantificables</MiniPill>
          <MiniPill icon={<ListChecks className="h-4 w-4" />}>Optimizar resumen</MiniPill>
          <MiniPill icon={<Search className="h-4 w-4" />}>Incluir keywords del puesto</MiniPill>
          <MiniPill icon={<BriefcaseBusiness className="h-4 w-4" />}>Mejorar experiencia</MiniPill>
        </div>
      </div>
    </div>
  );
}

function ProgressRing({
  percent,
  label,
  score = false,
  compact = false,
  size = "normal",
}: {
  percent: number;
  label?: string;
  score?: boolean;
  compact?: boolean;
  size?: "normal" | "large";
}) {
  const px = size === "large" ? 190 : compact ? 92 : 125;
  return (
    <div className="mx-auto grid place-items-center">
      <div
        className="relative grid place-items-center rounded-full"
        style={{
          width: px,
          height: px,
          background: `conic-gradient(${blue} 0deg ${percent * 3.6}deg, #e9f1ff ${percent * 3.6}deg 360deg)`,
        }}
      >
        <div
          className="grid place-items-center rounded-full bg-white"
          style={{ width: px - 20, height: px - 20 }}
        >
          <div className="text-center">
            <p className={`${size === "large" ? "text-[50px]" : "text-[38px]"} font-black leading-none text-[#070b2f]`}>
              {percent}
              {score ? "" : "%"}
            </p>
            <p className={`${size === "large" ? "text-[20px]" : "text-[16px]"} font-bold text-[#0c66d8]`}>
              {score ? "/100" : label}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepItem({
  icon,
  number,
  title,
  children,
}: {
  icon: ReactNode;
  number: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="text-center">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#edf5ff] text-[#0068ff]">
        {icon}
      </div>
      <div className="mt-4 flex items-start justify-center gap-2">
        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#0068ff] text-[12px] font-black text-white">
          {number}
        </span>
        <p className="text-[13px] font-black leading-4">{title}</p>
      </div>
      <p className="mt-2 text-[12px] font-medium leading-5 text-[#6a7280]">{children}</p>
    </div>
  );
}

function LaunchOffer({ compact, onClick }: { compact?: boolean; onClick: () => void }) {
  return (
    <div className="rounded-lg border border-[#cbdbea] bg-[#fbfdff] p-5 shadow-[0_8px_26px_rgba(15,25,55,0.05)]">
      <div className={compact ? "grid grid-cols-[1fr_1fr] gap-4" : ""}>
        <div>
          <span className="rounded-full bg-[#edf5ff] px-4 py-2 text-[12px] font-black text-[#0c55b8]">
            Oferta de lanzamiento
          </span>
          <div className="mt-4 flex items-end gap-2">
            <span className="text-[48px] font-black leading-none">$49</span>
            <span className="pb-2 text-[16px] font-black text-[#0068ff]">MXN</span>
          </div>
          <p className="mt-1 text-[13px] font-medium text-[#5f6673]">
            Pago único · Sin suscripciones
          </p>
          <p className="mt-3 flex items-center gap-2 text-[13px] font-black text-[#5f6673]">
            <Lock className="h-4 w-4 text-[#0068ff]" /> Pago seguro
          </p>
        </div>
        <div className={compact ? "border-l border-[#d8e1ec] pl-5" : "mt-4"}>
          <h3 className="text-[16px] font-black">Desbloquea tu CV profesional</h3>
          {["Versión optimizada para ATS", "Descarga en PDF", "Revisión de palabras clave", "Soporte prioritario"].map((item) => (
            <p key={item} className="mt-2 flex items-center gap-2 text-[13px] font-medium text-[#5f6673]">
              <CheckCircle2 className="h-4 w-4 text-[#0c66d8]" />
              {item}
            </p>
          ))}
        </div>
      </div>
      <button
        onClick={onClick}
        className="mt-5 flex h-14 w-full items-center justify-center gap-3 rounded-lg bg-[#0068ff] text-[17px] font-black text-white"
      >
        Desbloquear mi CV profesional <ArrowRight className="h-6 w-6" />
      </button>
    </div>
  );
}

function ProtectedFooter({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-3 px-8 text-center ${className}`}>
      <ShieldCheck className="h-8 w-8 shrink-0 text-[#0068ff]" />
      <p className="text-[14px] font-medium leading-5 text-[#5f6673]">
        <span className="font-black text-[#070b2f]">Tus datos están protegidos.</span>
        <br />
        No compartimos tu información.
      </p>
    </div>
  );
}

function PdfDocumentIcon({ large = false }: { large?: boolean }) {
  return (
    <div className={`${large ? "h-24 w-24" : "h-16 w-16"} grid place-items-center rounded-lg bg-[#fff1f1]`}>
      <div className={`${large ? "h-20 w-16" : "h-12 w-10"} relative rounded-md border border-[#d5dbe4] bg-white shadow-sm`}>
        <div className="absolute -right-px -top-px h-4 w-4 rounded-bl-md bg-[#dfe6ef]" />
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded bg-[#e92e34] px-2 py-1 text-[12px] font-black text-white">
          PDF
        </div>
      </div>
    </div>
  );
}

function AnalyzeRow({
  index,
  text,
  done,
  active,
}: {
  index: string;
  text: string;
  done?: boolean;
  active?: boolean;
}) {
  return (
    <div className="flex items-center gap-4 border-b border-[#edf0f5] px-5 py-4 last:border-b-0">
      <span
        className={`grid h-8 w-8 place-items-center rounded-full text-[16px] font-black ${
          done ? "bg-[#12b861] text-white" : active ? "bg-[#0068ff] text-white" : "bg-[#eef2f7] text-[#808a99]"
        }`}
      >
        {index}
      </span>
      <span className={`flex-1 text-[17px] font-black ${done || active ? "text-[#070b2f]" : "text-[#7c8594]"}`}>
        {text}
      </span>
      {done ? <CheckCircle2 className="h-7 w-7 text-[#12b861]" /> : null}
      {active ? <span className="h-7 w-7 rounded-full border-4 border-dotted border-[#0c66d8]" /> : null}
      {!done && !active ? <Circle className="h-7 w-7 text-[#c5ccd6]" /> : null}
    </div>
  );
}

function EvalCard({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-[#e6ebf2] bg-white p-4 text-center shadow-[0_6px_16px_rgba(15,25,55,0.04)]">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-lg bg-[#edf5ff] text-[#0068ff]">
        {icon}
      </div>
      <h3 className="mt-3 text-[16px] font-black">{title}</h3>
      <p className="mt-2 text-[12px] font-medium leading-5 text-[#616b79]">{children}</p>
    </div>
  );
}

function NumberedPanel({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="mt-4 rounded-lg border border-[#e0e5ec] bg-white p-3">
      <h2 className="mb-3 text-[17px] font-black">
        {number}. {title}
      </h2>
      {children}
    </div>
  );
}

function ProblemRow({
  icon,
  label,
  severity,
  tone,
}: {
  icon: "alert" | "warning" | "info";
  label: string;
  severity: string;
  tone: "red" | "amber" | "blue";
}) {
  const classes = {
    red: "bg-[#ffecef] text-[#cf334b]",
    amber: "bg-[#fff3e3] text-[#b96b13]",
    blue: "bg-[#edf5ff] text-[#0c66d8]",
  };
  return (
    <div className="mb-2 flex items-center gap-3 rounded-lg border border-[#e8edf4] px-3 py-3 last:mb-0">
      {icon === "alert" ? <AlertTriangle className="h-6 w-6 text-[#cf334b]" /> : null}
      {icon === "warning" ? <AlertTriangle className="h-6 w-6 text-[#d48624]" /> : null}
      {icon === "info" ? <Info className="h-6 w-6 text-[#0c66d8]" /> : null}
      <p className="flex-1 text-[14px] font-medium text-[#111632]">{label}</p>
      <span className={`rounded-full px-3 py-1 text-[12px] font-black ${classes[tone]}`}>
        {severity}
      </span>
      <ChevronRight className="h-5 w-5 text-[#9ba4b2]" />
    </div>
  );
}

function StatusChip({
  children,
  ok,
  warning,
}: {
  children: ReactNode;
  ok?: boolean;
  warning?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-[13px] font-black ${
        ok ? "bg-[#e9f9f0] text-[#15a45d]" : warning ? "bg-[#fff5e7] text-[#b96b13]" : ""
      }`}
    >
      {ok ? <CheckCircle2 className="h-5 w-5" /> : null}
      {warning ? <AlertTriangle className="h-5 w-5" /> : null}
      {children}
    </span>
  );
}

function RecommendationCard({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg bg-[#f7fbff] p-3 shadow-[inset_0_0_0_1px_rgba(210,222,238,0.7)]">
      <div className="grid h-11 w-11 place-items-center rounded-full bg-[#0068ff] text-white">
        {icon}
      </div>
      <h3 className="mt-3 text-[13px] font-black leading-4">{title}</h3>
      <p className="mt-2 text-[11px] font-medium leading-4 text-[#5f6673]">{children}</p>
      <ChevronRight className="ml-auto mt-2 h-5 w-5 text-[#8a929f]" />
    </div>
  );
}

function LockedPreview() {
  return (
    <div className="relative grid h-40 grid-cols-[2fr_1fr] gap-3 overflow-hidden rounded-lg border border-[#e0e5ec] bg-white p-3">
      <div className="rounded-lg bg-white p-4 blur-[3px]">
        <p className="text-[18px] font-black">Juan Pérez García</p>
        <p className="mt-2 h-2 w-40 rounded bg-[#dfe7f1]" />
        <p className="mt-5 h-2 w-full rounded bg-[#dfe7f1]" />
        <p className="mt-2 h-2 w-11/12 rounded bg-[#dfe7f1]" />
        <p className="mt-5 h-2 w-full rounded bg-[#dfe7f1]" />
        <p className="mt-2 h-2 w-9/12 rounded bg-[#dfe7f1]" />
      </div>
      <div className="rounded-lg bg-[#f8fbff] p-3 blur-[3px]">
        <p className="h-3 w-24 rounded bg-[#dfe7f1]" />
        {[70, 88, 95, 74, 84].map((width) => (
          <p key={width} className="mt-4 h-2 rounded bg-[#0068ff]" style={{ width: `${width}%` }} />
        ))}
      </div>
      <div className="absolute inset-0 grid place-items-center">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-white text-[#0068ff] shadow-[0_10px_28px_rgba(15,25,55,0.16)]">
          <Lock className="h-8 w-8" />
        </div>
      </div>
    </div>
  );
}

function TrustItem({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-1 text-[#5f6673]">
      <span className="text-[#0068ff]">{icon}</span>
      <span>{children}</span>
    </div>
  );
}

function BeforeAfterPreview() {
  return (
    <div className="relative rounded-lg border border-[#e0e5ec] bg-white p-4 shadow-[0_8px_26px_rgba(15,25,55,0.06)]">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <span className="rounded-full bg-[#eef2f7] px-3 py-2 text-[13px] font-black text-[#5f6673]">
            Antes
          </span>
          <div className="mt-3 h-56 rounded-lg border border-[#e1e5ec] bg-white p-5 blur-[3px]">
            <div className="mb-5 h-12 w-12 rounded-full bg-[#d1d7df]" />
            <p className="h-3 w-28 rounded bg-[#d8e0ea]" />
            <p className="mt-2 h-2 w-36 rounded bg-[#d8e0ea]" />
            {Array.from({ length: 8 }).map((_, index) => (
              <p key={index} className="mt-4 h-2 rounded bg-[#d8e0ea]" />
            ))}
          </div>
        </div>
        <div>
          <span className="rounded-full bg-[#edf5ff] px-3 py-2 text-[13px] font-black text-[#0c66d8]">
            Después
          </span>
          <div className="mt-3 h-56 overflow-hidden rounded-lg border border-[#dce5f0] bg-white p-4">
            <h3 className="text-[16px] font-black">María López</h3>
            <p className="text-[10px] font-black text-[#0c66d8]">Diseñadora UX/UI</p>
            <p className="mt-3 text-[8px] font-medium">CDMX, México · maria@email.com · 55 1234 5678</p>
            <h4 className="mt-4 text-[10px] font-black text-[#0c66d8]">Perfil profesional</h4>
            <p className="mt-1 text-[9px] leading-4">{demoAnalysis.improvedCV.summary}</p>
            <h4 className="mt-3 text-[10px] font-black text-[#0c66d8]">Experiencia laboral</h4>
            <p className="mt-1 text-[9px] font-black">Diseñadora UX/UI Senior</p>
            <ul className="mt-1 list-disc pl-4 text-[8px] leading-4">
              {demoAnalysis.improvedCV.experience[0].bullets.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <h4 className="mt-2 text-[10px] font-black text-[#0c66d8]">Educación</h4>
            <p className="text-[8px] leading-4">Licenciatura en Diseño Gráfico · 2016 - 2020</p>
          </div>
        </div>
      </div>
      <div className="absolute left-1/2 top-1/2 grid h-16 w-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-[#0068ff] shadow-[0_10px_28px_rgba(15,25,55,0.18)]">
        <Lock className="h-8 w-8" />
      </div>
    </div>
  );
}

function BenefitIcon({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="text-center">
      <div className="mx-auto text-[#0068ff]">{icon}</div>
      <p className="mt-2 text-[12px] font-medium leading-4 text-[#070b2f]">{children}</p>
    </div>
  );
}

function InputLike({
  icon,
  children,
  subtext,
}: {
  icon: ReactNode;
  children: ReactNode;
  subtext?: string;
}) {
  return (
    <div className="flex min-h-16 items-center gap-4 rounded-lg border border-[#d6dce5] bg-white px-4">
      <span className="text-[#0c66d8]">{icon}</span>
      <div>
        <p className="text-[16px] font-medium text-[#5f6673]">{children}</p>
        {subtext ? <p className="mt-1 text-[12px] font-medium text-[#7d8795]">{subtext}</p> : null}
      </div>
    </div>
  );
}

function MiniGuarantee({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="px-2 text-center">
      <div className="mx-auto text-[#0068ff]">{icon}</div>
      <h3 className="mt-2 text-[13px] font-black">{title}</h3>
      <p className="mt-1 text-[11px] font-medium leading-4 text-[#5f6673]">{children}</p>
    </div>
  );
}

function ImprovedCard({
  icon,
  title,
  children,
  tone = "blue",
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  tone?: "blue" | "green" | "purple";
}) {
  const toneClass = {
    blue: "bg-[#edf5ff] text-[#0068ff]",
    green: "bg-[#e9f9f0] text-[#15a45d]",
    purple: "bg-[#f1eaff] text-[#8d4de8]",
  };
  return (
    <div className="rounded-lg border border-[#e6ebf2] bg-white p-4 text-center shadow-[0_8px_22px_rgba(15,25,55,0.05)]">
      <div className={`mx-auto grid h-14 w-14 place-items-center rounded-full ${toneClass[tone]}`}>
        {icon}
      </div>
      <h3 className="mt-4 text-[15px] font-black leading-5">{title}</h3>
      <p className="mt-2 text-[12px] font-medium leading-5 text-[#5f6673]">{children}</p>
    </div>
  );
}

function TinyProblem({
  text,
  count,
  tone,
}: {
  text: string;
  count: string;
  tone: "red" | "amber" | "blue";
}) {
  const color = {
    red: "text-[#cf334b] bg-[#ffecef]",
    amber: "text-[#b96b13] bg-[#fff3e3]",
    blue: "text-[#0c66d8] bg-[#edf5ff]",
  };
  return (
    <div className="mt-3 flex items-center gap-2 text-[11px] font-medium text-[#111632]">
      {tone === "red" ? <AlertTriangle className="h-4 w-4 text-[#cf334b]" /> : null}
      {tone === "amber" ? <AlertTriangle className="h-4 w-4 text-[#d48624]" /> : null}
      {tone === "blue" ? <Info className="h-4 w-4 text-[#0c66d8]" /> : null}
      <span className="flex-1">{text}</span>
      <span className={`rounded-full px-2 py-1 text-[10px] font-black ${color[tone]}`}>{count}</span>
    </div>
  );
}

function MiniPill({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-[#edf5ff] px-3 py-2 text-[11px] font-black text-[#0c55b8]">
      {icon}
      {children}
    </span>
  );
}
