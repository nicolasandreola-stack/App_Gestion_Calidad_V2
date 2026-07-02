# Centro de Comando v2 — Contexto del Proyecto

## Stack
- **Frontend**: React + TypeScript + Vite + TailwindCSS
- **Backend**: Vercel Serverless Functions (Express)
- **Base de datos**: Google Sheets (via Service Account)
- **Deploy**: Vercel (auto-deploy desde GitHub)

## Repositorio
- El código vive en este mismo directorio
- El usuario sube cambios a GitHub manualmente desde la web (git no instalado localmente)
- Vercel redeploya automático al pushear a main

## Variables de entorno (solo en Vercel, no local)
- `GOOGLE_CREDENTIALS` — Service Account JSON de Google Cloud
- `GOOGLE_SPREADSHEET_ID` — ID del spreadsheet de datos

## Arquitectura de sincronización
- Los usuarios (equipo) tienen su dashboard en `/` y sincronizan con Google Sheets cada 30s si hay cambios
- El Admin ve el panel de equipo en `/admin`
- El Admin puede delegar tareas; el sistema detecta nuevas asignaciones via polling (60s) y muestra un **modal centrado persistente** con sonido
- Al confirmar el modal, el campo `acknowledged: true` se pushea al Sheet → el Admin ve ✅ Recibido / ⏳ Pendiente

## Estructura de datos (Google Sheets)
- **Hoja "Tareas"**: columnas A-S (S = acknowledged, agregada recientemente)
- **Hoja "Rutinas"**: columnas A-P

## Últimas funcionalidades implementadas (sesión actual)
1. ✅ Modal de nueva asignación (centrado, persistente, con sonido "ding-ding")
2. ✅ Campo `acknowledged` en Task → persiste en Google Sheets (columna S)
3. ✅ Íconos ✅ Recibido / ⏳ Pendiente en el panel Admin (tareas delegadas)
4. ✅ Toggle Auto-Sync movido al Header (reemplazó botón "Reportar")
5. ✅ Papelera en modal de Archivo (pestaña "Eliminadas" con restaurar)
6. ✅ Deduplicación: tareas completadas no aparecen en Eliminadas

## Archivos clave
- `components/Dashboard.tsx` — Dashboard del usuario (polling, modal, sync)
- `components/AdminDashboard.tsx` — Panel del admin (tareas delegadas, métricas)
- `components/Header.tsx` — Header con toggle Auto-Sync
- `components/Modals.tsx` — Todos los modales (incluye pestaña Eliminadas)
- `components/KPIBoard.tsx` — KPIs superiores
- `api/sheets.ts` — Lógica de lectura/escritura en Google Sheets
- `api/index.ts` — Rutas Express (/api/sync/get y /api/sync/push)
- `types.ts` — Interfaces TypeScript (incluye `acknowledged?: boolean` en Task)

## Pendientes / ideas futuras
- Instalar git localmente para no depender de GitHub web
- Notificación push real (requeriría Service Worker + push server)
- Panel de historial de cambios del Admin
