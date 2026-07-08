# BlankATS — Checklist de release

Usar este checklist antes de mover cambios hacia `production`.

## 1. Preparación

```txt
[ ] La tarea está en una rama feature/* o fix/*
[ ] El alcance está claro
[ ] No se mezclan pagos + rediseño + base de datos en el mismo cambio
[ ] No hay secretos en código
[ ] No hay capturas con tokens en el repo
```

## 2. Verificación técnica

```txt
[ ] npm install si cambiaron dependencias
[ ] npm run lint
[ ] npm run build
[ ] No hay errores TypeScript
[ ] No hay warnings críticos de Next/Netlify
```

## 3. Verificación funcional

```txt
[ ] Landing carga
[ ] Upload de CV funciona
[ ] Pegar CV funciona
[ ] Análisis IA responde
[ ] Diagnóstico muestra score/problemas/recomendaciones
[ ] Paywall muestra precio correcto
[ ] Botón de pago abre Mercado Pago
[ ] Redirección post-pago funciona
[ ] PDF se descarga
[ ] DOCX se descarga
[ ] /success sin orderId no habilita descargas
```

## 4. Verificación de pagos

### Sandbox

```txt
[ ] Token TEST abre sandbox
[ ] Buyer Test User puede pagar con saldo ficticio
[ ] Orden queda approved en Supabase
[ ] download_token existe
```

### Producción

```txt
[ ] Token producción abre checkout real sin marca Sandbox
[ ] Compra real controlada de $49 MXN pasa
[ ] Supabase registra approved
[ ] Mercado Pago muestra dinero recibido
[ ] PDF y DOCX finales descargan
```

## 5. Verificación de Supabase

Consultar últimas órdenes:

```sql
select
  created_at,
  updated_at,
  status,
  amount,
  currency,
  payment_provider,
  mercado_pago_preference_id is not null as has_preference_id,
  mercado_pago_payment_id is not null as has_payment_id,
  paid_at is not null as has_paid_at,
  download_token is not null as has_download_token,
  analysis_json is not null as has_analysis_json,
  improved_cv_json is not null as has_improved_cv_json,
  original_file_name
from public.orders
order by created_at desc
limit 10;
```

Resultado esperado para pago aprobado:

```txt
status = approved
amount = 49
currency = MXN
has_preference_id = true
has_payment_id = true
has_paid_at = true
has_download_token = true
has_analysis_json = true
has_improved_cv_json = true
```

## 6. Verificación Netlify

```txt
[ ] Deploy publicado dice Published/Ready
[ ] Build complete
[ ] Deploying complete
[ ] Functions desplegadas
[ ] URL pública carga
```

## 7. Promoción a producción

Solo después de pasar todo:

```txt
[ ] Merge controlado hacia production
[ ] Deploy controlado en Netlify
[ ] Prueba rápida en producción
[ ] Registrar resultado en docs o issue
```

## 8. Rollback

Si algo falla:

```txt
[ ] No hacer más cambios encima
[ ] Volver al último deploy estable en Netlify
[ ] Crear rama fix/*
[ ] Corregir mínimo necesario
[ ] QA de nuevo
```
