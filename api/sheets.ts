import { google } from "googleapis";
import { GoogleAuth } from "google-auth-library";
import { GlobalCloudData, Task, RoutineItem, BackupData } from "../types.js";

// Helper para formatear fechas consistentemente como D/M/YYYY (Día/Mes/Año)
function formatDate(date: Date): string {
    const d = date.getDate();
    const m = date.getMonth() + 1;
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
}

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];
const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID || "1yRf1a_wtB0ZM9Q5o0HO0ARQVd5bHBCoGjEiZdfuxlfs";

let authClient: any = null;

async function getAuthClient() {
    if (authClient) return authClient;
    
    // Si estamos en Vercel, usamos la variable de entorno segura
    if (process.env.GOOGLE_CREDENTIALS) {
        let creds;
        try {
            creds = JSON.parse(process.env.GOOGLE_CREDENTIALS);
        } catch (e) {
            // Intentar limpiar si Vercel lo envolvió mal
            let cleaned = process.env.GOOGLE_CREDENTIALS;
            if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
                cleaned = cleaned.slice(1, -1);
            }
            cleaned = cleaned.replace(/\\n/g, '\n');
            creds = JSON.parse(cleaned);
        }
        
        // google-auth-library necesita saltos de línea reales en la llave privada
        if (creds.private_key && typeof creds.private_key === 'string') {
            creds.private_key = creds.private_key.replace(/\\n/g, '\n');
        }

        authClient = new GoogleAuth({
            credentials: creds,
            scopes: SCOPES,
        });
    } else {
        // Fallback para desarrollo local
        authClient = new GoogleAuth({
            keyFile: "google-credentials.json", // Path relative to project root
            scopes: SCOPES,
        });
    }
    
    return authClient;
}

export async function fetchFromSheets(): Promise<GlobalCloudData> {
    const auth = await getAuthClient();
    const sheets = google.sheets({ version: "v4", auth });

    const globalData: GlobalCloudData = { users: {}, projects: [], lastUpdate: new Date().toISOString() };

    // Fetch Tareas
    let tareasRows: any[][] = [];
    try {
        const tareasRes = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: "Tareas!A2:U", // Columna U = userComments
        });
        tareasRows = tareasRes.data.values || [];
    } catch (e) {
        console.error("Error leyendo Tareas", e);
    }

    // Parse Tareas
    tareasRows.forEach(row => {
        const [id, usuario, fechaCarga, nombre, subtarea, notas, cat, comp, fechaProg, prior, estado, delegado, l1, n1, l2, n2, l3, n3, acknowledged, adminComments, userComments] = row;
        if (!usuario) return;
        const u = usuario.toLowerCase();
        if (!globalData.users[u]) initUser(globalData, u);

        let parsedSubtasks = undefined;
        if (subtarea) {
            try {
                parsedSubtasks = JSON.parse(subtarea);
            } catch (e) { }
        }

        const task: Task = {
            id: Number(id) || Date.now(),
            text: nombre || "",
            cat: (cat as any) || "Otro",
            comp: (comp as any) || "med",
            date: fechaProg || undefined,
            l1: l1 || "", n1: n1 || "",
            l2: l2 || "", n2: n2 || "",
            l3: l3 || "", n3: n3 || "",
            del: delegado || "",
            prio: prior === "VERDADERO" || prior === "TRUE" || prior === "Sí",
            note: notas || "",
            isStandby: estado === "Standby",
            completedAt: estado === "Completada" ? (fechaCarga || formatDate(new Date())) : undefined,
            deleted: estado === "Eliminada",
            subtasks: parsedSubtasks,
            acknowledged: acknowledged === "TRUE" || acknowledged === "Sí" || acknowledged === "true",
            adminComments: adminComments || undefined,
            userComments: userComments || undefined,
        };

        if (estado === "Completada") {
            globalData.users[u].cTks!.push(task);
        } else if (estado === "Eliminada") {
            globalData.users[u].dTks!.push(task);
        } else {
            globalData.users[u].tks.push(task);
        }
    });

    // Fetch Rutinas
    let rutinasRows: any[][] = [];
    try {
        const rutinasRes = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: "Rutinas!A2:P",
        });
        rutinasRows = rutinasRes.data.values || [];
    } catch (e) {
        console.error("Error leyendo Rutinas", e);
    }

    // Parse Rutinas (ID, Usuario, Nombre, Bloque, Notas, Lunes, Martes, Miercoles, Jueves, Viernes, Link1, Nombre1, Link2, Nombre2, Link3, Nombre3)
    rutinasRows.forEach(row => {
        const [id, usuario, nombre, bloque, notas, lu, ma, mi, ju, vi, l1, n1, l2, n2, l3, n3] = row;
        if (!usuario) return;
        const u = usuario.toLowerCase();
        if (!globalData.users[u]) initUser(globalData, u);

        const daysArr: number[] = [];
        if (lu === "Sí" || lu === "TRUE") daysArr.push(1);
        if (ma === "Sí" || ma === "TRUE") daysArr.push(2);
        if (mi === "Sí" || mi === "TRUE") daysArr.push(3);
        if (ju === "Sí" || ju === "TRUE") daysArr.push(4);
        if (vi === "Sí" || vi === "TRUE") daysArr.push(5);

        const routineId = id || ("r" + Date.now());
        const routine: RoutineItem = {
            id: routineId,
            text: nombre || "",
            days: daysArr.length === 5 ? "all" : daysArr, // Si marca todos, ponemos all (simplificado)
            block: (bloque as any) || 'start',
            l1: l1 || "", n1: n1 || "",
            l2: l2 || "", n2: n2 || "",
            l3: l3 || "", n3: n3 || ""
        };

        globalData.users[u].rtM.push(routine);

        if (notas) {
            if (!globalData.users[u].rtS[routineId]) {
                globalData.users[u].rtS[routineId] = { done: false, note: notas };
            } else {
                globalData.users[u].rtS[routineId].note = notas;
            }
        }
    });

    // Fetch Proyectos
    let proyectosRows: any[][] = [];
    try {
        const proyectosRes = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: "Proyectos!A2:K",
        });
        proyectosRows = proyectosRes.data.values || [];
    } catch (e) {
        console.error("Error leyendo Proyectos", e);
    }

    proyectosRows.forEach(row => {
        const [id, project, phase, name, startDate, endDate, assignee, progress, status, subtasksStr, details, link] = row;
        if (!id) return;
        
        let parsedSubtasks = undefined;
        if (subtasksStr) {
            try {
                parsedSubtasks = JSON.parse(subtasksStr);
            } catch (e) {}
        }

        globalData.projects!.push({
            id: id,
            project: project || "",
            phase: phase || "",
            name: name || "",
            startDate: startDate || "",
            endDate: endDate || "",
            assignee: assignee || "",
            progress: Number(progress) || 0,
            status: status || "PENDIENTE",
            subtasks: parsedSubtasks,
            details: details || "",
            link: link || ""
        });
    });

    return globalData;
}

export async function pushToSheets(globalData: GlobalCloudData) {
    const auth = await getAuthClient();
    const sheets = google.sheets({ version: "v4", auth });

    const tareasRows: any[][] = [];
    const rutinasRows: any[][] = [];

    // Map Tasks and Routines
    for (const [usuario, data] of Object.entries(globalData.users)) {
        const allTasks = [
            ...(data.tks || []).map(t => ({ ...t, estado: t.isStandby ? 'Standby' : 'Activa' })),
            ...(data.cTks || []).map(t => ({ ...t, estado: 'Completada' })),
            ...(data.dTks || []).map(t => ({ ...t, estado: 'Eliminada' }))
        ];

        allTasks.forEach(t => {
            const fechaCarga = t.completedAt || formatDate(new Date());
            tareasRows.push([
                t.id,
                usuario,
                `'${fechaCarga}`, // Apóstrofe inicial: fuerza texto plano en Google Sheets
                t.text,
                t.subtasks && t.subtasks.length > 0 ? JSON.stringify(t.subtasks) : "",
                t.note || "",
                t.cat,
                t.comp,
                t.date || "",
                t.prio ? "Sí" : "No",
                t.estado,
                t.del || "",
                t.l1 || "", t.n1 || "",
                t.l2 || "", t.n2 || "",
                t.l3 || "", t.n3 || "",
                t.acknowledged ? "Sí" : "No",  // Columna S
                t.adminComments || "",           // Columna T
                t.userComments || "",             // Columna U
            ]);
        });

        (data.rtM || []).forEach(r => {
            let lu = "No", ma = "No", mi = "No", ju = "No", vi = "No";
            if (r.days === "all") {
                lu = "Sí"; ma = "Sí"; mi = "Sí"; ju = "Sí"; vi = "Sí";
            } else if (Array.isArray(r.days)) {
                if (r.days.includes(1)) lu = "Sí";
                if (r.days.includes(2)) ma = "Sí";
                if (r.days.includes(3)) mi = "Sí";
                if (r.days.includes(4)) ju = "Sí";
                if (r.days.includes(5)) vi = "Sí";
            }

            rutinasRows.push([
                r.id,
                usuario,
                r.text,
                r.block || 'start',
                data.rtS[r.id]?.note || "", // Notas (se mapean al state de la rutina)
                lu, ma, mi, ju, vi,
                r.l1 || "", r.n1 || "",
                r.l2 || "", r.n2 || "",
                r.l3 || "", r.n3 || ""
            ]);
        });
    }

    const proyectosRows: any[][] = [];
    if (globalData.projects) {
        globalData.projects.forEach(p => {
             proyectosRows.push([
                p.id,
                p.project,
                p.phase,
                p.name,
                p.startDate,
                p.endDate,
                p.assignee,
                p.progress,
                p.status,
                p.subtasks && p.subtasks.length > 0 ? JSON.stringify(p.subtasks) : "",
                p.details || "",
                p.link || ""
             ]);
        });
    }

    try {
        // Clear old rows first (starting from row 2)
        await sheets.spreadsheets.values.clear({ spreadsheetId: SPREADSHEET_ID, range: "Tareas!A2:U" });
        await sheets.spreadsheets.values.clear({ spreadsheetId: SPREADSHEET_ID, range: "Rutinas!A2:P" });
        try {
            await sheets.spreadsheets.values.clear({ spreadsheetId: SPREADSHEET_ID, range: "Proyectos!A2:K" });
        } catch (e) {
            console.warn("Could not clear Proyectos sheet, maybe it doesn't exist yet");
        }

        // Batch upload
        if (tareasRows.length > 0) {
            await sheets.spreadsheets.values.update({
                spreadsheetId: SPREADSHEET_ID,
                range: "Tareas!A2:U",
                valueInputOption: "RAW",
                requestBody: { values: tareasRows }
            });
        }

        if (rutinasRows.length > 0) {
            await sheets.spreadsheets.values.update({
                spreadsheetId: SPREADSHEET_ID,
                range: "Rutinas!A2:P",
                valueInputOption: "RAW",
                requestBody: { values: rutinasRows }
            });
        }

        if (proyectosRows.length > 0) {
            await sheets.spreadsheets.values.update({
                spreadsheetId: SPREADSHEET_ID,
                range: "Proyectos!A2:K",
                valueInputOption: "RAW",
                requestBody: { values: proyectosRows }
            });
        }

    } catch (e) {
        console.error("Error writing to Sheets", e);
        throw e;
    }
}

function initUser(globalData: GlobalCloudData, u: string) {
    globalData.users[u] = {
        rtM: [],
        rtS: {},
        tks: [],
        h: [],
        cTks: [],
        dTks: [],
        ach: [],
        rtH: {}
    };
}
