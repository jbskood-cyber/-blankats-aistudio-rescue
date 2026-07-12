# BlankATS — Documentación del proyecto

## 1. Resumen ejecutivo

BlankATS es una aplicación web móvil para analizar un CV, mostrar un diagnóstico inicial y vender una versión profesional mejorada en PDF y Word mediante Mercado Pago.

El objetivo del producto es simple:

1. El usuario sube o pega su CV.
2. La IA analiza el contenido.
3. La app muestra diagnóstico y recomendaciones.
4. El usuario paga para desbloquear el CV mejorado.
5. La app entrega archivos descargables en PDF y DOCX.

## 2. Estado funcional validado

Validado en sandbox antes de pasar a producción:

- Análisis de CV con IA: funciona.
- Diagnóstico: funciona.
- Paywall: funciona.
- Mercado Pago sandbox: funciona con Buyer Test User y saldo ficticio.
- Redirección posterior al pago: funciona.
- Supabase registra órdenes `approved`: funciona.
- Descarga PDF: funciona.
- Descarga Word/DOCX: funciona.
- `/success` sin `orderId`: redirige a landing y no deja descargar sin pago.

## 3. Stack técnico

- Framework: Next.js App Router.
- Lenguaje: TypeScript.
- UI: React + Tailwind.
- IA: Gemini mediante API key en backend.
- Base de datos: Supabase PostgreSQL.
- Pagos: Mercado Pago Checkout Pro vía REST.
- Deploy: Netlify.
- Rama de producción: `production`.
- Rama de desarrollo principal: `main`.

## 4. Variables de entorno críticas

Variables esperadas en Netlify:

```txt
GEMINI_API_KEY
MERCADO_PAGO_ACCESS_TOKEN
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_DEMO_MODE
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_URL
NODE_VERSION
```

Reglas de seguridad:

- `GEMINI_API_KEY` nunca debe estar en frontend.
- `MERCADO_PAGO_ACCESS_TOKEN` nunca debe estar en frontend.
- `SUPABASE_SERVICE_ROLE_KEY` nunca debe estar en frontend.
- Solo variables con prefijo `NEXT_PUBLIC_` pueden llegar al navegador.
- Las llaves secretas deben vivir en API routes, funciones serverless o backend.

## 5. Flujo de pago

Flujo lógico:

```txt
Usuario → Paywall → /api/checkout → Mercado Pago → Webhook → Supabase → /success → Descargas
```

La ruta `/api/checkout` crea una preferencia de Mercado Pago y guarda una orden inicial `pending` en Supabase.

El webhook de Mercado Pago debe actualizar la orden a `approved` cuando el pago se acredita.

## 6. Regla crítica Mercado Pago: sandbox vs producción

La app debe decidir el link de checkout según el token:

```ts
const isTestToken = mpToken.startsWith("TEST-");

const initPoint = isTestToken
  ? mpData?.sandbox_init_point || mpData?.init_point || null
  : mpData?.init_point || null;
```

Regla:

- Token `TEST-...` → usar `sandbox_init_point`.
- Token de producción → usar `init_point`.

Nunca se debe priorizar `sandbox_init_point` cuando se usa token de producción.

## 7. Supabase — tabla principal

Tabla principal:

```txt
public.orders
```

Campos importantes:

```txt
id
created_at
updated_at
customer_email
amount
currency
status
payment_provider
mercado_pago_preference_id
mercado_pago_payment_id
analysis_json
improved_cv_json
original_file_name
download_token
paid_at
```

Estados esperados:

```txt
pending   → orden creada, pago no confirmado
approved  → pago confirmado, descargas habilitadas
failed    → pago rechazado o error confirmado
```

## 8. Reglas de descarga

La descarga solo debe habilitarse cuando:

```txt
status = approved
orderId válido
download_token válido
improved_cv_json existe
```

`/success` sin `orderId` no debe mostrar descargas.

## 9. Netlify

Proyecto:

```txt
blankats-cv-mx
```

URL pública:

```txt
https://blankats-cv-mx.netlify.app
```

Rama publicada:

```txt
production
```

Regla operativa:

- `production` es la única rama que debe publicarse como producción.
- `main` es para desarrollo integrado.
- Ramas `feature/*` o `fix/*` son para trabajo de Codex.

## 10. Decisiones de producto actuales

- Precio inicial: $49 MXN.
- Producto vendido: optimización profesional de CV en PDF y DOCX.
- Mercado principal: México.
- Flujo corto y mono-uso.
- El diagnóstico inicial funciona como lead magnet y justificación del pago.

## 11. Pendientes importantes

- Confirmar primer pago real de $49 MXN con credenciales de producción.
- Verificar que Supabase registre el pago real como `approved`.
- Verificar que Mercado Pago muestre el dinero real recibido.
- Separar credenciales de producción y pruebas para futuros branch deploys.
- Crear harness visual/dev para seguir construyendo pantallas sin depender del flujo real de pago.
