# Guía de Despliegue en Netlify (BlankATS)

Este documento detalla el procedimiento para configurar un despliegue seguro, optimizado y controlado en **Netlify** utilizando una rama de producción dedicada, con el fin de evitar que cada cambio en `main` desencadene un despliegue automático innecesario.

---

## 1. Estrategia de Ramas (Branches)

*   **Rama de desarrollo (`main`):** Es la rama activa donde trabaja el agente de IA Studio e itera sobre las funcionalidades.
*   **Rama de producción (`production`):** Es la rama exclusiva utilizada para el despliegue final a producción y accesos del público general.

### Flujo de Trabajo Recomendado:
1. Integra y prueba tus cambios en `main` dentro de AI Studio.
2. Cuando tengas una versión estable que desees publicar en producción, haz un merge o push de la rama `main` a la rama `production`.
3. Netlify detectará el cambio en la rama `production` y realizará el despliegue automáticamente.

---

## 2. Configuración en el Panel de Netlify

Para evitar consumir minutos de compilación innecesarios y proteger tu saldo/créditos en Netlify, configura lo siguiente en el panel de administración de tu sitio (**Site settings > Build & deploy > Branches**):

1. **Production branch:** Establécelo como `production`.
2. **Branch deploys:** Selecciona **None** (esto evita que Netlify intente compilar la rama `main` u otras ramas adicionales).
3. **Deploy Previews:** Desactiva los Deploy Previews (o selecciona **None**) para que los Pull Requests no generen despliegues automáticos que consuman recursos.

---

## 3. Variables de Entorno Requeridas en Netlify

Configura estas variables en **Site settings > Environment variables**:

| Variable | Tipo | Descripción |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | Secreto | API Key de Google Gemini para realizar el análisis de los CVs. |
| `SUPABASE_URL` | Configuración | URL de tu proyecto de Supabase (ej: `https://xxxxxx.supabase.co`). |
| `SUPABASE_SERVICE_ROLE_KEY` | Secreto | Clave de rol de servicio (Service Role Key) para insertar y actualizar órdenes con RLS. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Pública | Clave pública de Supabase para consultas directas desde el cliente si es necesario. |
| `MERCADO_PAGO_ACCESS_TOKEN` | Secreto | Access Token de producción o Sandbox de Mercado Pago. Si no se provee, la aplicación utilizará automáticamente el simulador de pagos interactivo. |
| `NEXT_PUBLIC_APP_URL` | Pública | La URL pública de tu sitio en Netlify (ej: `https://blankats.netlify.app`). Es crítica para las redirecciones post-pago (`back_urls`) y recepción de Webhooks. |
| `NEXT_PUBLIC_DEMO_MODE` | Pública | Establécela estrictamente en `false` en producción para obligar al procesamiento real del CV con la pasarela de pagos. |

---

## 4. Configuración del Proyecto (`netlify.toml`)

El archivo `netlify.toml` ubicado en la raíz del proyecto ya ha sido creado con la siguiente estructura óptima para Next.js con App Router:

```toml
[build]
  command = "npm run build"
  publish = ".next"

[build.environment]
  NODE_VERSION = "20"
  NEXT_USE_NETLIFY_EDGE = "true"
```

Netlify detectará automáticamente que es un proyecto de Next.js y aplicará el runtime correspondiente de forma nativa para servir las rutas del servidor (API Routes) de forma eficiente.
