# BlankATS — Prompts para Codex

## 1. Prompt base para cualquier tarea

```txt
Trabaja en BlankATS en una rama feature/* o fix/*.
No trabajes directo sobre production.
No hagas merge a production.
No cambies variables de entorno.
No expongas secretos.
No toques pagos, Supabase ni IA salvo que la tarea lo pida explícitamente.

Antes de implementar:
1. Resume el objetivo.
2. Lista archivos probables a tocar.
3. Explica riesgos.

Después de implementar:
1. Lista archivos modificados.
2. Ejecuta npm run lint.
3. Ejecuta npm run build.
4. Reporta resultado exacto.
5. Indica cómo probar visualmente.
```

## 2. Prompt para crear una nueva pantalla UI sin romper flujo real

```txt
Quiero crear/mejorar una pantalla de BlankATS sin depender del flujo real de análisis/pago.

Crea o usa un dev harness protegido para visualizar pantallas con datos mock.
Requisitos:
- No llamar Gemini real.
- No llamar Mercado Pago real.
- No escribir en Supabase real.
- Si agregas rutas /dev/*, deben estar bloqueadas o redirigir en producción.
- Usa datos mock realistas.
- Mantén diseño mobile-first.
- Ejecuta lint/build.
```

## 3. Prompt para rediseñar UI

```txt
Rediseña la UI de [pantalla] manteniendo intacta la lógica funcional.

Restricciones:
- No tocar API routes.
- No tocar Supabase.
- No tocar Mercado Pago.
- No cambiar nombres de props críticas.
- No romper rutas existentes.
- Mantener mobile-first.
- Mejorar legibilidad, espaciado, jerarquía visual y microcopy.
- Ejecutar lint/build.

Entrega:
- Archivos modificados.
- Capturas o instrucciones de revisión visual.
- Riesgos detectados.
```

## 4. Prompt para cambios en pagos

```txt
Tarea sensible: modificar pagos de Mercado Pago.

Reglas:
- Cambios mínimos.
- No tocar UI salvo necesario.
- No tocar Gemini.
- No tocar generación PDF/DOCX.
- No imprimir tokens completos.
- Logs seguros únicamente.
- Mantener back_urls y webhook salvo que la tarea indique lo contrario.

Regla sandbox/producción:
- Token TEST-* usa sandbox_init_point.
- Token producción usa init_point.

Verificar:
- npm run lint
- npm run build
- Checkout sandbox con token TEST
- Checkout real con token producción no debe mostrar marca Sandbox
```

## 5. Prompt para cambios en Supabase

```txt
Tarea sensible: modificar Supabase.

Antes de cambiar:
- Explica exactamente qué tabla/campo/política se tocará.
- No ejecutar migraciones destructivas.
- No borrar datos.
- No relajar RLS sin justificación.

Reglas:
- service_role solo en backend.
- anon key solo para frontend.
- Las descargas solo se habilitan con status approved.

Entrega:
- SQL propuesto.
- Riesgo.
- Plan de reversión.
```

## 6. Prompt para preparar release

```txt
Prepara release de main hacia production.

Tareas:
1. Revisar diferencias entre main y production.
2. Identificar cambios de riesgo.
3. Ejecutar npm run lint.
4. Ejecutar npm run build.
5. Confirmar que no hay secretos en código.
6. Generar checklist QA.
7. No hacer merge hasta aprobación humana.
```

## 7. Prompt para documentar cambios después de una fase

```txt
Actualiza la documentación del proyecto en docs/.

Incluye:
- Qué se cambió.
- Por qué se cambió.
- Archivos tocados.
- Cómo probarlo.
- Riesgos.
- Estado actual.
- Siguiente paso recomendado.

No documentes secretos ni tokens.
```
