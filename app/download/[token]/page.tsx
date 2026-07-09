"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Download, FileDown, FileText, Home, ShieldCheck } from "lucide-react";

type ImprovedCV = {
  name?: string;
  title?: string;
  contact?: string;
  summary?: string;
  experience?: { company?: string; role?: string; period?: string; bullets?: string[] }[];
  education?: { institution?: string; degree?: string; period?: string; description?: string }[];
  skills?: string[];
  projects?: { name?: string; period?: string; bullets?: string[] }[];
  certifications?: string[];
};

type DownloadPayload = {
  original_file_name?: string | null;
  improvedCV?: ImprovedCV;
};

function getCvName(cv: ImprovedCV | undefined) {
  return (cv?.name || "usuario").replace(/\s+/g, "_");
}

function cvSections(cv: ImprovedCV) {
  const sections: { title: string; lines: string[] }[] = [];
  if (cv.summary) sections.push({ title: "Resumen profesional", lines: [cv.summary] });
  if (cv.experience?.length) {
    sections.push({
      title: "Experiencia laboral",
      lines: cv.experience.flatMap((item) => [
        [item.role, item.company, item.period].filter(Boolean).join(" | "),
        ...(item.bullets || []).map((bullet) => `• ${bullet}`),
      ]),
    });
  }
  if (cv.education?.length) {
    sections.push({
      title: "Educación",
      lines: cv.education.map((item) => [item.degree, item.institution, item.period].filter(Boolean).join(" | ")),
    });
  }
  if (cv.skills?.length) sections.push({ title: "Habilidades", lines: [cv.skills.join(", ")] });
  if (cv.projects?.length) {
    sections.push({
      title: "Proyectos",
      lines: cv.projects.flatMap((item) => [
        [item.name, item.period].filter(Boolean).join(" | "),
        ...(item.bullets || []).map((bullet) => `• ${bullet}`),
      ]),
    });
  }
  if (cv.certifications?.length) sections.push({ title: "Certificaciones", lines: cv.certifications });
  return sections;
}

export default function DownloadTokenPage() {
  const [data, setData] = useState<DownloadPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const token = useMemo(() => {
    if (typeof window === "undefined") return "";
    return window.location.pathname.split("/").filter(Boolean).pop() || "";
  }, []);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/download/${token}`)
      .then(async (res) => {
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(payload.error || "No se pudo abrir el enlace.");
        setData(payload);
      })
      .catch((err) => setError(err.message || "No se pudo abrir el enlace."))
      .finally(() => setLoading(false));
  }, [token]);

  const downloadPDF = async () => {
    if (!data?.improvedCV) return;
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF("p", "pt", "a4");
    const margin = 50;
    const width = doc.internal.pageSize.getWidth() - margin * 2;
    const height = doc.internal.pageSize.getHeight();
    let y = 54;
    const addText = (text: string, size = 10, bold = false) => {
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setFontSize(size);
      const lines = doc.splitTextToSize(text, width);
      lines.forEach((line: string) => {
        if (y > height - margin) {
          doc.addPage();
          y = margin;
        }
        doc.text(line, margin, y);
        y += size + 5;
      });
    };

    const cv = data.improvedCV;
    addText((cv.name || "").toUpperCase(), 20, true);
    if (cv.title) addText(cv.title, 11, true);
    if (cv.contact) addText(cv.contact, 9);
    y += 10;
    cvSections(cv).forEach((section) => {
      y += 8;
      addText(section.title.toUpperCase(), 11, true);
      section.lines.filter(Boolean).forEach((line) => addText(line, 9.5));
    });
    doc.save(`CV_Optimizado_${getCvName(cv)}.pdf`);
  };

  const downloadDOCX = async () => {
    if (!data?.improvedCV) return;
    const { AlignmentType, Document, HeadingLevel, Packer, Paragraph, TextRun } = await import("docx");
    const cv = data.improvedCV;
    const children: InstanceType<typeof Paragraph>[] = [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: (cv.name || "").toUpperCase(), bold: true, size: 32 })],
      }),
    ];
    if (cv.title) children.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: cv.title, bold: true, size: 22 })] }));
    if (cv.contact) children.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: cv.contact, size: 18 })] }));
    cvSections(cv).forEach((section) => {
      children.push(new Paragraph({ text: section.title, heading: HeadingLevel.HEADING_2 }));
      section.lines.filter(Boolean).forEach((line) => children.push(new Paragraph({ text: line })));
    });
    const docxDocument = new Document({ sections: [{ children }] });
    const blob = await Packer.toBlob(docxDocument);
    const url = window.URL.createObjectURL(blob);
    const a = window.document.createElement("a");
    a.href = url;
    a.download = `CV_Optimizado_${getCvName(cv)}.docx`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const cv = data?.improvedCV;

  return (
    <main className="min-h-screen bg-white text-[#070b2f]">
      <div className="mx-auto min-h-screen w-full max-w-[390px] px-5 py-5">
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[20px] font-black tracking-[-0.035em]">
            <FileText className="h-8 w-8 text-[#0068ff]" />
            <span>Blank<span className="text-[#0068ff]">ATS</span></span>
          </div>
          <Link href="/" className="flex h-9 items-center gap-1.5 rounded-[7px] border border-[#cad8e8] px-3 text-[13px] font-black text-[#0c55b8]">
            <Home className="h-4 w-4" />
            Ir al inicio
          </Link>
        </header>

        {loading ? (
          <section className="grid min-h-[70vh] place-items-center text-center">
            <p className="text-[15px] font-black">Cargando enlace privado...</p>
          </section>
        ) : error ? (
          <section className="grid min-h-[70vh] place-items-center text-center">
            <div className="rounded-[14px] border border-red-100 bg-red-50 p-4 text-[14px] font-bold text-red-600">{error}</div>
          </section>
        ) : (
          <section className="pt-14 text-center">
            <div className="mx-auto grid h-[78px] w-[78px] place-items-center rounded-full bg-[#e4f9ef] text-[#0fbd68] shadow-[0_0_0_12px_rgba(228,249,239,0.55)]">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <h1 className="mt-7 text-[30px] font-black leading-none tracking-[-0.04em]">Tu CV está listo</h1>
            <p className="mt-2 text-[14px] font-medium text-[#626a79]">Puedes volver a descargar tu versión mejorada.</p>

            <div className="mt-7 flex items-center gap-3 rounded-[12px] border border-[#e4e9f0] bg-white p-3 text-left shadow-[0_6px_16px_rgba(15,25,55,0.04)]">
              <div className="grid h-[58px] w-[58px] shrink-0 place-items-center rounded-[10px] border border-[#f1d7d7] text-[#e1242f]">
                <FileText className="h-7 w-7" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[16px] font-black">CV_Optimizado_{getCvName(cv)}.pdf</p>
                <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-[#dff8ec] px-2.5 py-1 text-[12px] font-black text-[#129853]">
                  <CheckCircle2 className="h-4 w-4" />
                  Generado
                </span>
              </div>
            </div>

            <div className="mt-5 space-y-2.5">
              <button onClick={downloadPDF} className="flex h-[48px] w-full items-center justify-center gap-2.5 rounded-[9px] bg-[#0068ff] text-[15px] font-black text-white shadow-[0_10px_20px_rgba(0,104,255,0.18)]">
                <Download className="h-5 w-5" />
                Descargar PDF
              </button>
              <button onClick={downloadDOCX} className="flex h-[46px] w-full items-center justify-center gap-2.5 rounded-[9px] border border-[#0068ff] bg-white text-[15px] font-black text-[#0068ff]">
                <FileDown className="h-5 w-5" />
                Descargar DOCX
              </button>
            </div>

            <div className="mt-8 flex items-center justify-center gap-3 text-center">
              <ShieldCheck className="h-7 w-7 text-[#0068ff]" />
              <p className="text-[12.5px] font-medium leading-4 text-[#626a79]">
                <span className="font-black text-[#070b2f]">Tus datos están protegidos.</span>
                <br />
                No compartimos tu información.
              </p>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
