import { GoogleGenAI, Type } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

// Initialize the Gemini client on the server side
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

export async function POST(req: NextRequest) {
  try {
    const { pdfBase64, originalText } = await req.json();

    if (!pdfBase64 && !originalText) {
      return NextResponse.json(
        { error: "Debe proporcionar un archivo PDF en base64 o el texto original del CV." },
        { status: 400 }
      );
    }

    let contents: any[] = [];

    if (pdfBase64) {
      contents.push({
        inlineData: {
          mimeType: "application/pdf",
          data: pdfBase64,
        },
      });
    }

    contents.push({
      text: `Eres el motor principal de procesamiento de CVs para BlankATS.
BlankATS es una aplicación que recibe un CV en PDF o en texto, lo analiza con Gemini y genera una versión profesional optimizada en formato PDF/JSON.
Tu trabajo es encargarte completamente del análisis, clasificación, mejora y control de calidad del CV proporcionado.

No optimices para candidatos específicos ni crees reglas para nombres concretos. El sistema debe funcionar para cualquier CV razonable: estudiante, administrativo, ventas, software, diseño, salud, logística, finanzas, ejecutivo, bilingüe, incompleto, saturado, premium, sencillo o mal redactado.

OBJETIVO PRINCIPAL:
Transformar el CV original en una versión más clara, profesional, ordenada y lista para enviar, sin inventar datos y sin degradar información real.

PROCESO OBLIGATORIO:
Antes de generar el CV final, realiza internamente estos pasos:
1. Evaluar calidad de lectura del CV.
2. Detectar si el texto viene roto, incompleto o mal extraído.
3. Extraer solo hechos confiables.
4. Clasificar el CV en un modo de procesamiento.
5. Mejorar el contenido según ese modo.
6. Generar advertencias si hay datos dudosos.
7. Generar el CV final limpio (improvedCV).
8. Decidir si el resultado se puede descargar, requiere revisión o necesita mejor input (deliveryDecision).

MODOS DE PROCESAMIENTO:
- PRESERVE_AND_POLISH:
  Usa este modo cuando el CV ya es bueno o premium. Conserva datos, cargos, empresas, fechas, logros y estructura. Solo mejora claridad, tono, orden, consistencia y redacción ligera. No reescribas de forma agresiva.
- RESTRUCTURE_AND_IMPROVE:
  Usa este modo cuando el CV está mal redactado, saturado, repetitivo o desordenado. Reestructura, mejora bullets, ordena habilidades, crea un resumen profesional si hay información suficiente y elimina repeticiones. Mantén todos los hechos reales de forma íntegra.
- REVIEW_REQUIRED:
  Usa este modo cuando el CV viene mal leído, escaneado, con columnas problemáticas, tablas rotas, texto truncado o datos dudosos. No finjas certeza, no inventes nada, genera solo con información confiable y advierte al usuario en los campos correspondientes.

ESTADOS DE CALIDAD:
- qualityStatus = "green": El CV se leyó bien y el resultado es confiable.
- qualityStatus = "yellow": Hay posibles problemas de lectura o datos dudosos. El resultado puede usarse, pero debe revisarse.
- qualityStatus = "red": El CV no se puede procesar con suficiente confianza. Se debe pedir al usuario pegar texto o subir un PDF más claro.

recommendedAction:
- "download_ready": Si qualityStatus es green.
- "review_before_download": Si qualityStatus es yellow.
- "request_better_input": Si qualityStatus es red.

REGLAS DE NO INVENCIÓN:
Nunca inventes: empresas, cargos, fechas, periodos, métricas, porcentajes, resultados cuantitativos, instituciones educativas, títulos, certificaciones, correos, teléfonos, ciudades, links, herramientas ni idiomas.
Si un dato no está claro, no lo completes, no lo corrijas creativamente, no lo inventes. Repórtalo en dataIntegrityWarnings.

DETECCIÓN DE TEXTO ROTO:
Detecta y reporta en extractionWarnings o dataIntegrityWarnings si hay: palabras cortadas, frases truncadas, nombres de empresa raros, números dentro de palabras, fragmentos incompletos, finales antinaturales como “pagos s.”, columnas mezcladas, tablas mal leídas, texto escaneado o ilegible. Si detectas texto roto, no lo metas al improvedCV como si estuviera correcto.

REGLAS PARA improvedCV:
El objeto improvedCV debe estar completamente limpio. Nunca debe incluir: placeholders, corchetes (ej: "[Sugerencia: ...]"), notas de la IA, advertencias, comentarios, "pendiente", "N/A", "agregar aquí", ni texto roto evidente. Las sugerencias de mejora deben ir únicamente en "recommendations", "problems", "extractionWarnings" o "dataIntegrityWarnings".

REGLAS PARA deliveryDecision:
- Si qualityStatus = "green": allowDownload = true, showWarningBeforeDownload = false, userMessage = "Tu CV está listo para descargar."
- Si qualityStatus = "yellow": allowDownload = true, showWarningBeforeDownload = true, userMessage = "Detectamos posibles detalles de lectura. Revisa el resultado antes de usarlo."
- Si qualityStatus = "red": allowDownload = false, showWarningBeforeDownload = false, userMessage = "No pudimos leer tu CV con suficiente calidad. Pega el texto del CV o sube una versión más clara."

REGLAS DE REDACCIÓN DE BULLETS (VIÑETAS):
Cada bullet de experiencia o proyectos debe:
- Ser un string independiente.
- Iniciar con un verbo de acción en primera o tercera persona profesional (ej: "Optimicé", "Coordiné", "Dirigí", "Desarrollé") cuando sea posible.
- Estar basado estrictamente en información real, sin inventar métricas ni porcentajes.
- Ser claro, conciso y profesional.
- No incluir sugerencias ni texto de diagnóstico.
NUNCA unas viñetas (bullets) con ".-", " - ", saltos de línea internos ni símbolos dentro del mismo string. Cada logro va en su propio string del array.

PROMESA SEGURA:
No prometas empleo, ni pasar ATS garantizado, ni vencer sistemas de reclutamiento. Usa lenguaje seguro, por ejemplo: estructura más clara, presentación profesional, fácil de revisar, preparado para procesos digitales y reclutadores.

IDIOMA:
El idioma de toda la respuesta JSON (incluyendo la diagnosis y el improvedCV) debe ser idéntico al idioma predominante del CV proporcionado (si el original está en inglés, responde en inglés; si está en español, responde en español).

Texto/CV original para procesar:
${originalText ? `"""\n${originalText}\n"""` : "(Ver archivo PDF adjunto)"}
`,
    });

    // Define the models to try in case of transient errors, prioritizing the highly reliable gemini-3.5-flash
    const modelsToTry = ["gemini-3.5-flash", "gemini-flash-latest"];
    let response;
    let lastError: any = null;
    let attempt = 0;
    const maxAttempts = 3;

    while (attempt < maxAttempts) {
      // Determine which model to use on this attempt
      const currentModel = modelsToTry[attempt % modelsToTry.length];
      
      try {
        console.log(`Intentando analizar CV con el modelo ${currentModel} (Intento ${attempt + 1}/${maxAttempts})...`);
        response = await ai.models.generateContent({
          model: currentModel,
          contents: contents,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                score: {
                  type: Type.INTEGER,
                  description: "Puntuación de claridad del CV del 1 al 100 basada en su legibilidad, redacción y estructura ATS.",
                },
                qualityStatus: {
                  type: Type.STRING,
                  enum: ["green", "yellow", "red"],
                  description: "Estado de calidad de la lectura y extracción del CV original: green, yellow o red.",
                },
                processingMode: {
                  type: Type.STRING,
                  enum: ["PRESERVE_AND_POLISH", "RESTRUCTURE_AND_IMPROVE", "REVIEW_REQUIRED"],
                  description: "Modo de procesamiento interno que describe la estrategia de reescritura aplicada.",
                },
                recommendedAction: {
                  type: Type.STRING,
                  enum: ["download_ready", "review_before_download", "request_better_input"],
                  description: "La acción recomendada principal basada en el estado de calidad del CV.",
                },
                extractionWarnings: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "Advertencias de problemas con la lectura del texto original, columnas rotas, palabras truncadas, etc.",
                },
                dataIntegrityWarnings: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "Advertencias de falta de información confiable, dudas sobre fechas o inconsistencias en los datos.",
                },
                problems: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "Problemas específicos detectados en el CV original (ej: lenguaje informal, falta de resumen profesional).",
                },
                missingSections: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "Secciones recomendadas que hacen falta en el CV original.",
                },
                recommendations: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "Acciones recomendadas específicas para el candidato para mejorar la presentación.",
                },
                improvedCV: {
                  type: Type.OBJECT,
                  properties: {
                    name: {
                      type: Type.STRING,
                      description: "Nombre completo del candidato tal como aparece en el original.",
                    },
                    title: {
                      type: Type.STRING,
                      description: "Título profesional resumido y moderno del candidato.",
                    },
                    contact: {
                      type: Type.STRING,
                      description: "Datos de contacto formateados en una sola línea, por ejemplo: 'email@example.com | +34 123 456 789 | Madrid, España | linkedin.com/in/usuario'. Solo usa datos reales del original.",
                    },
                    summary: {
                      type: Type.STRING,
                      description: "Resumen profesional redactado de forma impactante y concisa.",
                    },
                    experience: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          company: { type: Type.STRING, description: "Nombre de la empresa o institución." },
                          role: { type: Type.STRING, description: "Cargo desempeñado." },
                          period: { type: Type.STRING, description: "Periodo trabajado, ej: '2021 - Presente' o 'Ene 2019 - Dic 2020'." },
                          bullets: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                            description: "Lista de logros y funciones desempeñadas, cada uno redactado como viñeta independiente en un string independiente del array (sin usar guiones ni puntos de inicio)."
                          },
                        },
                        required: ["company", "role", "period", "bullets"],
                      },
                    },
                    education: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          institution: { type: Type.STRING, description: "Nombre de la universidad o institución educativa." },
                          degree: { type: Type.STRING, description: "Título o carrera." },
                          period: { type: Type.STRING, description: "Periodo de estudios o año de graduación." },
                          description: { type: Type.STRING, description: "Detalle adicional opcional sobre especialidad o logros académicos." },
                        },
                        required: ["institution", "degree", "period"],
                      },
                    },
                    skills: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: "Lista de habilidades (hard skills y soft skills) reorganizadas limpiamente.",
                    },
                    projects: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          name: { type: Type.STRING, description: "Nombre del proyecto." },
                          bullets: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                            description: "Lista de logros, tecnologías y descripciones del proyecto, cada uno redactado como viñeta independiente en un string independiente."
                          },
                          period: { type: Type.STRING, description: "Periodo u año de realización." },
                        },
                        required: ["name", "bullets"],
                      },
                      description: "Proyectos relevantes si aparecían en el original.",
                    },
                    certifications: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: "Lista de certificaciones y cursos, si aparecían en el original.",
                    },
                  },
                  required: ["name", "title", "contact", "summary", "experience", "education", "skills"],
                },
                deliveryDecision: {
                  type: Type.OBJECT,
                  properties: {
                    allowDownload: {
                      type: Type.BOOLEAN,
                      description: "Indica si se permite la descarga del CV en base al estado de calidad.",
                    },
                    showWarningBeforeDownload: {
                      type: Type.BOOLEAN,
                      description: "Indica si se debe alertar al usuario antes de permitir la descarga.",
                    },
                    userMessage: {
                      type: Type.STRING,
                      description: "Mensaje explicativo para el usuario sobre el resultado y calidad de la lectura.",
                    },
                  },
                  required: ["allowDownload", "showWarningBeforeDownload", "userMessage"],
                },
              },
              required: [
                "score",
                "qualityStatus",
                "processingMode",
                "recommendedAction",
                "extractionWarnings",
                "dataIntegrityWarnings",
                "problems",
                "missingSections",
                "recommendations",
                "improvedCV",
                "deliveryDecision"
              ],
            },
          },
        });
        
        // If we successfully get a response, break the loop
        break;
      } catch (err: any) {
        attempt++;
        lastError = err;
        console.error(`Error en intento ${attempt} con el modelo ${currentModel}:`, err);

        if (attempt >= maxAttempts) {
          throw err;
        }

        // Exponential backoff delay (1.5s, 3s)
        const delay = Math.pow(2, attempt) * 1500;
        console.log(`Error detectado. Esperando ${delay}ms antes de intentar con el siguiente modelo en la lista de fallbacks...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    if (!response) {
      throw lastError || new Error("No se pudo obtener respuesta de Gemini tras varios intentos");
    }

    const text = response.text;
    if (!text) {
      throw new Error("No se recibió respuesta de Gemini");
    }

    const data = JSON.parse(text.trim());
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Error en la ruta /api/analyze:", error);
    return NextResponse.json(
      { error: "Error al analizar el CV. Por favor, inténtelo de nuevo más tarde. Detalles: " + error.message },
      { status: 500 }
    );
  }
}
