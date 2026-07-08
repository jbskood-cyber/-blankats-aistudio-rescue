# BlankATS — Main es solo desarrollo

Este documento fija una regla operativa crítica del proyecto.

## Regla principal

```txt
main = desarrollo y visualización en AI Studio
production = app real publicada en Netlify
```

La rama `main` puede contener herramientas de desarrollo, mocks y simulación de pagos para permitir mejorar la app con rapidez.

La rama `production` nunca debe recibir funciones de simulación de pago ni herramientas que permitan saltar el pago real.

## Pago simulado

El modo de pago simulado existe únicamente para desarrollo.

Uso permitido:

```txt
main
AI Studio preview
trabajo de Codex
mejoras visuales
nuevas funciones
pruebas de flujo
```

Uso prohibido:

```txt
production
Netlify producción
usuarios reales
checkout real
```

## Qué puede existir en main

En `main` sí puede existir:

```txt
CHECKOUT_MODE=mock
Modo desarrollo: pago simulado
Simular pago y continuar
rutas o utilidades dev
mocks de pantallas
pruebas de UI
```

Esto se permite porque `main` es el espacio de trabajo.

## Qué nunca debe pasar a production

Nunca se debe pasar a `production` sin revisión extrema:

```txt
CHECKOUT_MODE=mock activo
botón Simular pago y continuar
etiqueta Modo desarrollo: pago simulado
rutas /dev/* públicas
bypass de descarga
mock checkout activo
```

## Regla de Netlify

Netlify producción debe seguir conectado a:

```txt
production
```

No cambiar Netlify producción a:

```txt
main
```

## Regla de AI Studio

AI Studio puede visualizar:

```txt
main
```

Ese es el entorno donde se diseñan y prueban nuevas funciones.

## Regla de merge

Flujo permitido:

```txt
feature/* → main
```

Flujo hacia producción solo con QA completo:

```txt
main → production
```

Pero antes de mover algo a `production`, se debe verificar:

```txt
[ ] No aparece Modo desarrollo: pago simulado
[ ] No aparece Simular pago y continuar
[ ] CHECKOUT_MODE efectivo en producción es production
[ ] Mercado Pago real abre sin Sandbox
[ ] /success sin pago no descarga
[ ] npm run lint pasa
[ ] npm run build pasa
[ ] QA manual pasa
```

## Regla final

```txt
La simulación de pagos puede vivir en main.
La simulación de pagos nunca debe verse en production.
```
