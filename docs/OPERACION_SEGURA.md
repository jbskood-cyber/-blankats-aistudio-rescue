# BlankATS — Operación segura de desarrollo

Este documento define cómo seguir construyendo BlankATS sin romper producción.

## 1. Principio central

Producción no se toca directamente.

El flujo seguro es:

```txt
feature/* → main → production → Netlify producción
```

Significado:

- `feature/*`: trabajo experimental de Codex.
- `main`: integración de desarrollo.
- `production`: versión estable publicada.

Netlify debe publicar únicamente desde `production`.

## 2. Reglas de ramas

### production

Uso:

- Rama estable.
- Solo recibe cambios después de QA.
- Cualquier cambio aquí puede afectar usuarios reales.

Reglas:

- No hacer commits directos.
- No usar para experimentos.
- No meter rediseños incompletos.
- No mezclar cambios visuales grandes con pagos o base de datos.

### main

Uso:

- Rama de integración.
- Aquí se juntan cambios listos para probar.
- Puede tener avances no publicados.

Reglas:

- Puede avanzar con Codex.
- No debe auto-publicarse como producción.
- Debe pasar `npm run lint` y `npm run build` antes de promover a `production`.

### feature/*

Uso:

- Una rama por mejora.

Ejemplos:

```txt
feature/dev-screen-harness
feature/redesign-paywall
feature/cv-editor-v2
fix/mercadopago-init-point
```

Reglas:

- Codex trabaja aquí.
- Se abre PR hacia `main`.
- Se revisa visualmente antes de fusionar.

## 3. Flujo recomendado para cada mejora

```txt
1. Definir objetivo en ChatGPT.
2. Crear prompt claro para Codex.
3. Codex crea rama feature/*.
4. Codex implementa cambio pequeño.
5. Codex corre lint/build.
6. Se revisa visualmente en preview o local.
7. PR hacia main.
8. Merge a main si pasa revisión.
9. QA completo.
10. Merge controlado de main a production solo cuando se quiera publicar.
```

## 4. Cómo desarrollar nuevas pantallas sin depender del flujo real

Problema actual:

AI Studio y el flujo real no permiten acceder fácilmente a pantallas posteriores como paywall, success o download sin pasar por análisis/pago.

Solución:

Crear un **dev harness** dentro del proyecto.

Ejemplo de rutas internas:

```txt
/dev/screens
/dev/mock-analysis
/dev/mock-paywall
/dev/mock-success
/dev/mock-download
```

Estas rutas deben:

- Usar datos mock.
- No llamar Mercado Pago real.
- No escribir en Supabase real.
- Estar desactivadas o protegidas en producción.

Regla recomendada:

```ts
const isDevToolsEnabled =
  process.env.NODE_ENV !== "production" ||
  process.env.NEXT_PUBLIC_ENABLE_DEV_TOOLS === "true";
```

Si `isDevToolsEnabled` es falso, las rutas `/dev/*` deben redirigir a `/`.

## 5. Feature flags

Para funciones nuevas, usar flags:

```txt
NEXT_PUBLIC_FEATURE_CV_EDITOR=false
NEXT_PUBLIC_FEATURE_NEW_PAYWALL=false
NEXT_PUBLIC_FEATURE_DEV_SCREENS=false
```

Regla:

- En desarrollo: se pueden activar.
- En producción: solo se activan cuando estén probadas.

## 6. Separación de entornos

Idealmente:

```txt
Producción → Mercado Pago producción + Supabase producción
Preview/dev → Mercado Pago test + Supabase test/dev
```

Mínimo aceptable si todavía no hay Supabase separado:

- No usar pagos reales en branch deploys.
- No usar token productivo en previews si se van a probar cambios experimentales.
- No permitir `/dev/*` en producción.
- Nunca exponer service role en frontend.

## 7. Reglas para Mercado Pago

### Sandbox

- Usar Buyer Test User.
- Usar saldo ficticio o tarjetas de prueba.
- Usar token `TEST-...`.
- Debe abrir `sandbox_init_point`.

### Producción

- Usar Access Token productivo.
- Debe abrir `init_point`.
- No debe aparecer marca de Sandbox.
- Hacer solo compras reales controladas durante QA final.

## 8. Reglas para Supabase

- La app solo debe desbloquear descargas si la orden está `approved`.
- Las órdenes `pending` de pruebas fallidas no son graves, pero deben poder distinguirse.
- El backend puede usar `SUPABASE_SERVICE_ROLE_KEY`.
- El frontend nunca debe recibir `SUPABASE_SERVICE_ROLE_KEY`.

## 9. Checklist antes de publicar a production

```txt
[ ] npm run lint pasa
[ ] npm run build pasa
[ ] Landing carga
[ ] Upload/pegar CV funciona
[ ] Diagnóstico se genera
[ ] Paywall carga
[ ] Checkout abre modo correcto
[ ] Pago aprobado actualiza Supabase
[ ] PDF descarga
[ ] DOCX descarga
[ ] /success sin orderId no muestra descargas
[ ] No hay claves visibles en consola ni frontend
[ ] Netlify deploy queda Published/Ready
```

## 10. Regla de oro

Si una mejora toca pagos, Supabase, descargas o IA:

```txt
No se mezcla con rediseños grandes.
```

Se hace en PR separado, con QA separado.

## 11. Flujo de emergencia si producción se rompe

1. No hacer más deploys.
2. Identificar último deploy estable en Netlify.
3. Usar rollback desde Netlify si es necesario.
4. Revisar logs de funciones.
5. Corregir en rama `fix/*`.
6. Probar en preview.
7. Promover a `production` solo con build exitoso.

## 12. Qué hacer cuando Codex trabaja

Prompt base para Codex:

```txt
Trabaja en una rama feature/* o fix/*, no en production.
No toques variables de entorno.
No cambies pagos, Supabase ni IA si no es parte explícita de la tarea.
Entrega archivos modificados, comandos ejecutados y resultado de lint/build.
No hagas merge a production.
```
