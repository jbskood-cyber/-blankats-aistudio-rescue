# BlankATS — Regla oficial de entornos y pagos

Este documento elimina ambigüedades sobre cómo seguir desarrollando en `main` sin romper los pagos reales de `production`.

## 1. Decisión oficial

BlankATS tendrá **un mismo código base** con comportamiento distinto por entorno.

No vamos a borrar pagos en `main` manualmente. No vamos a comentar código de Mercado Pago para poder desarrollar. Eso es peligroso porque ese cambio podría llegar a producción.

La solución oficial es:

```txt
main / desarrollo      → pago simulado controlado
sandbox / QA pagos     → Mercado Pago test
production / real      → Mercado Pago real obligatorio
```

## 2. Rama vs entorno

La rama y el modo de pago son cosas distintas.

```txt
Rama = dónde vive el código.
Modo de pago = cómo se comporta el checkout según variables de entorno.
```

Ramas:

```txt
feature/*  → trabajo de Codex
main       → integración y desarrollo
production → versión real publicada
```

Modos de pago:

```txt
mock        → simula pago para desarrollo
sandbox     → usa Mercado Pago test
production  → usa Mercado Pago real
```

## 3. Variable obligatoria

Crear una variable server-side:

```txt
CHECKOUT_MODE
```

Valores permitidos:

```txt
mock
sandbox
production
```

Valor por defecto seguro si falta la variable:

```txt
production
```

Esto evita que un entorno mal configurado active mock por accidente.

## 4. Configuración oficial por entorno

### 4.1 main / desarrollo

```txt
CHECKOUT_MODE=mock
```

Comportamiento esperado:

- No abre Mercado Pago.
- No usa Access Token productivo.
- Permite avanzar después del paywall.
- Permite diseñar y probar pantallas posteriores.
- Debe mostrar una etiqueta visible solo para desarrollo: `Modo desarrollo: pago simulado`.
- Puede crear una orden de prueba o usar flujo mock interno.
- Nunca debe considerarse una venta real.

### 4.2 QA de Mercado Pago sandbox

```txt
CHECKOUT_MODE=sandbox
MERCADO_PAGO_ACCESS_TOKEN=<token TEST>
```

Comportamiento esperado:

- Usa Mercado Pago test.
- Abre `sandbox_init_point`.
- Permite Buyer Test User, saldo ficticio y tarjetas de prueba.
- Sirve para validar webhook y órdenes `approved` sin dinero real.

### 4.3 production real

```txt
CHECKOUT_MODE=production
MERCADO_PAGO_ACCESS_TOKEN=<token productivo>
NEXT_PUBLIC_DEMO_MODE=false
```

Comportamiento esperado:

- Usa Mercado Pago real.
- Abre `init_point`.
- Nunca abre `sandbox_init_point`.
- Nunca muestra botón de pago simulado.
- Nunca permite descarga sin orden `approved` real.

## 5. Regla de seguridad más importante

El pago simulado puede existir en el código, pero no puede activarse en producción.

Debe existir una guarda defensiva en backend:

```ts
const checkoutMode = process.env.CHECKOUT_MODE ?? "production";
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
const isProductionHost = appUrl.includes("blankats-cv-mx.netlify.app");

if (checkoutMode === "mock" && isProductionHost) {
  throw new Error("Mock checkout is blocked on production host.");
}
```

Regla:

```txt
Si CHECKOUT_MODE=mock y el host es producción → bloquear.
```

Así, aunque el código de mock llegue a `production`, no se activa.

## 6. Regla Mercado Pago init point

La app debe elegir el link según el modo:

```ts
if (checkoutMode === "sandbox") {
  initPoint = mpData?.sandbox_init_point || mpData?.init_point || null;
}

if (checkoutMode === "production") {
  initPoint = mpData?.init_point || null;
}
```

Regla crítica:

```txt
production nunca prioriza sandbox_init_point.
```

## 7. Qué se puede hacer en main

En `main` sí se puede:

- Rediseñar pantallas.
- Agregar nuevas funciones.
- Crear rutas de desarrollo.
- Crear mocks.
- Simular pago.
- Probar pantallas posteriores al paywall.
- Usar datos falsos.

Pero solo si el comportamiento depende de `CHECKOUT_MODE=mock`.

## 8. Qué NO se puede hacer en main

No se permite:

- Eliminar Mercado Pago del código base.
- Comentar llamadas reales de pago.
- Crear un botón de descarga gratis sin guardas.
- Hacer que `/success` funcione sin orden válida en producción.
- Usar `NEXT_PUBLIC_` para secretos.
- Subir tokens al repo.

## 9. Cómo debe verse el modo mock

En modo mock, el paywall puede mostrar:

```txt
Modo desarrollo: pago simulado
```

Botón:

```txt
Simular pago y continuar
```

Ese botón solo aparece cuando:

```txt
CHECKOUT_MODE=mock
```

En production, ese botón no debe renderizarse.

## 10. Dev harness recomendado

Para dejar de depender de AI Studio y poder diseñar pantallas internas, se recomienda crear:

```txt
/dev/screens
/dev/mock-diagnosis
/dev/mock-paywall
/dev/mock-success
/dev/mock-download
```

Reglas:

- Solo funcionan en desarrollo o con flag explícito.
- No llaman Gemini real.
- No llaman Mercado Pago real.
- No escriben ventas reales.
- No exponen secretos.
- En producción redirigen a `/` o devuelven 404.

## 11. Feature flags recomendados

```txt
NEXT_PUBLIC_FEATURE_DEV_TOOLS=false
NEXT_PUBLIC_FEATURE_NEW_PAYWALL=false
NEXT_PUBLIC_FEATURE_CV_EDITOR=false
```

Regla:

- En main se pueden activar para probar.
- En production quedan en `false` hasta aprobar QA.

## 12. Política de merges

El código de mock puede vivir en `main`, pero solo pasa a `production` si:

```txt
[ ] CHECKOUT_MODE por defecto es production
[ ] production tiene CHECKOUT_MODE=production
[ ] mock está bloqueado en host production
[ ] /success sin pago no descarga
[ ] lint pasa
[ ] build pasa
[ ] QA de pago real pasa
```

## 13. Prompt oficial para Codex

```txt
Implementa CHECKOUT_MODE para BlankATS.

Objetivo:
Permitir que main/desarrollo use pago simulado para avanzar después del paywall, sin afectar production.

Reglas:
- CHECKOUT_MODE=mock: no llamar Mercado Pago; permitir flujo simulado.
- CHECKOUT_MODE=sandbox: usar token TEST y sandbox_init_point.
- CHECKOUT_MODE=production: usar token productivo e init_point.
- Default si falta CHECKOUT_MODE: production.
- Bloquear mock si NEXT_PUBLIC_APP_URL contiene blankats-cv-mx.netlify.app.
- No tocar Gemini.
- No tocar generación PDF/DOCX salvo necesario para mocks.
- No exponer secretos.
- Logs seguros.
- npm run lint.
- npm run build.

Resultado esperado:
En main podemos diseñar y probar pantallas posteriores al pago sin Mercado Pago real.
En production el pago real sigue siendo obligatorio.
```

## 14. Resumen final

La regla oficial es:

```txt
No se elimina el pago en main.
Se agrega un modo mock controlado por entorno.
Production siempre usa pago real.
```
