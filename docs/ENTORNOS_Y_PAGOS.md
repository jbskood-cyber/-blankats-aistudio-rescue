# BlankATS — Entornos y modo de pagos

Este documento define cómo permitir desarrollo cómodo en `main` sin romper pagos reales en `production`.

## 1. Problema

Para seguir diseñando y agregando funciones, necesitamos acceder a pantallas posteriores al análisis del CV sin depender de Mercado Pago real.

El problema no debe resolverse eliminando pagos solo en una rama de forma manual, porque ese cambio podría terminar llegando a `production` por accidente.

## 2. Solución correcta

Usar una variable de entorno server-side que controle el modo de checkout.

Nombre recomendado:

```txt
CHECKOUT_MODE
```

Valores permitidos:

```txt
mock
sandbox
production
```

## 3. Comportamiento por entorno

### main / desarrollo

```txt
CHECKOUT_MODE=mock
```

Comportamiento:

- No se abre Mercado Pago real.
- Se muestra botón o flujo de pago simulado.
- Permite avanzar a `/success` y descargar archivos mock/reales de prueba.
- Sirve para UI, UX, nuevas pantallas y funciones.

### sandbox / QA de pagos

```txt
CHECKOUT_MODE=sandbox
```

Comportamiento:

- Usa token TEST de Mercado Pago.
- Abre `sandbox_init_point`.
- Permite probar Buyer Test User, saldo ficticio y webhook.

### production

```txt
CHECKOUT_MODE=production
```

Comportamiento:

- Usa token productivo de Mercado Pago.
- Abre `init_point`.
- Nunca debe abrir `sandbox_init_point`.
- Nunca debe habilitar pago simulado.

## 4. Regla de seguridad crítica

El bypass de pago nunca debe depender solo de la rama.

Debe depender de una variable de entorno y tener guardas defensivas.

Regla recomendada:

```ts
const checkoutMode = process.env.CHECKOUT_MODE ?? "production";
const isProdHost = appUrl.includes("blankats-cv-mx.netlify.app");

if (checkoutMode === "mock" && isProdHost) {
  throw new Error("Mock checkout cannot run on production host.");
}
```

Así, aunque alguien pase el código a producción, el bypass no funciona si producción no tiene `CHECKOUT_MODE=mock`.

## 5. Variables recomendadas en Netlify

### Production context

```txt
CHECKOUT_MODE=production
MERCADO_PAGO_ACCESS_TOKEN=<token productivo>
NEXT_PUBLIC_DEMO_MODE=false
```

### Branch deploys / deploy previews / main development

```txt
CHECKOUT_MODE=mock
NEXT_PUBLIC_DEMO_MODE=true
```

Opcional si se quiere probar sandbox:

```txt
CHECKOUT_MODE=sandbox
MERCADO_PAGO_ACCESS_TOKEN=<token TEST>
NEXT_PUBLIC_DEMO_MODE=false
```

## 6. Qué NO hacer

No hacer esto:

```txt
Eliminar Mercado Pago del código en main y esperar no mezclarlo con production.
```

No hacer esto:

```txt
Comentar manualmente el checkout real para desarrollar.
```

No hacer esto:

```txt
Usar un botón de descarga gratis visible en production.
```

## 7. Qué SÍ hacer

Implementar un checkout adapter:

```txt
lib/checkout/create-checkout-session.ts
```

Con tres modos:

```txt
createMockCheckout()
createSandboxCheckout()
createProductionCheckout()
```

La ruta `/api/checkout` solo decide cuál usar según `CHECKOUT_MODE`.

## 8. UX para desarrollo

En modo mock, el paywall puede mostrar una etiqueta discreta:

```txt
Modo desarrollo: pago simulado
```

Y un botón:

```txt
Simular pago y continuar
```

Ese botón debe existir únicamente si:

```txt
CHECKOUT_MODE=mock
```

## 9. Checklist para Codex

```txt
[ ] Crear CHECKOUT_MODE server-side
[ ] mock permite avanzar sin Mercado Pago
[ ] sandbox usa sandbox_init_point
[ ] production usa init_point
[ ] mock bloqueado en host production
[ ] logs seguros sin tokens
[ ] lint pasa
[ ] build pasa
[ ] producción no muestra pago simulado
```

## 10. Objetivo final

Poder trabajar en `main` y en AI Studio con pago simulado, sin bloquear el diseño de nuevas funciones, mientras `production` conserva pagos reales seguros.
