import express from "express";

import { google } from "googleapis";
import { GoogleAuth } from "google-auth-library";
import dotenv from "dotenv";
import { fetchFromSheets, pushToSheets } from "./sheets.js";

dotenv.config();

const app = express();
app.use(express.json({ limit: "50mb" }));

// --- GOOGLE DRIVE SERVICE ACCOUNT CONFIG ---
// The user provides the JSON key in the environment variable GOOGLE_SERVICE_ACCOUNT_KEY
// This variable should contain the entire JSON content of the key file.
const SERVICE_ACCOUNT_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
const TARGET_FOLDER_ID = '1iniK-YPZ8BYac8YeK_Uu5_EWxcC0UPH6'; // Hardcoded folder ID from previous context


  // API Route to fetch Drive files using Service Account
  app.get("/api/drive/files", async (req, res) => {
    try {
      if (!SERVICE_ACCOUNT_KEY) {
        return res.status(500).json({ error: "Falta la configuración de la Cuenta de Servicio (GOOGLE_SERVICE_ACCOUNT_KEY)." });
      }

      const folderId = req.query.folderId as string || TARGET_FOLDER_ID;

      let credentials;
      try {
        credentials = JSON.parse(SERVICE_ACCOUNT_KEY);
      } catch (e1) {
        try {
          let cleanedKey = SERVICE_ACCOUNT_KEY;
          if (cleanedKey.startsWith('"') && cleanedKey.endsWith('"')) {
            cleanedKey = cleanedKey.slice(1, -1);
          }
          cleanedKey = cleanedKey.replace(/\\n/g, '\n');
          credentials = JSON.parse(cleanedKey);
        } catch (e2) {
          return res.status(500).json({ error: "El formato de la llave de servicio (JSON) es inválido." });
        }
      }

      // Authenticate
      const auth = new GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/drive.readonly'],
      });

      const drive = google.drive({ version: 'v3', auth });

      // List Files in Folder
      const listRes = await drive.files.list({
        q: `'${folderId}' in parents and mimeType = 'application/vnd.google-apps.document' and trashed = false`,
        fields: 'files(id, name)',
        includeItemsFromAllDrives: true,
        supportsAllDrives: true,
      });

      const files = listRes.data.files;
      let fullContext = "";

      if (files && files.length > 0) {
        fullContext += `\n--- DOCUMENTOS EN CARPETA DRIVE (${files.length}) ---\n`;

        // Fetch content for each file (parallel requests for speed)
        const filePromises = files.map(async (file) => {
          try {
            if (!file.id) return "";
            const exportRes = await drive.files.export({
              fileId: file.id,
              mimeType: 'text/plain',
            });
            // The response body is the text content
            return `\n>>> ${file.name}\n${exportRes.data}\n`;
          } catch (err) {
            console.error(`Error reading file ${file.name}:`, err);
            return `\n[Error leyendo: ${file.name}]\n`;
          }
        });

        const contents = await Promise.all(filePromises);
        fullContext += contents.join("");

        // Limitar a ~100,000 caracteres (aprox 25k tokens) para evitar Error 429 (Quota Exceeded)
        const isFullRequested = req.query.full === 'true';
        if (!isFullRequested && fullContext.length > 100000) {
          fullContext = fullContext.substring(0, 100000) + "\n\n...[CONTENIDO TRUNCADO POR LÍMITE DE TAMAÑO DE LA API. ACTIVA EL MODO COMPLETO EN CONFIGURACIÓN]...";
        }

      } else {
        fullContext += `\n[ADVERTENCIA: Carpeta vacía o sin Google Docs].\n`;
      }

      res.json({ context: fullContext });

    } catch (error: any) {
      console.error("Error en /api/drive/files:", error);
      res.status(500).json({ error: error.message || "Error interno del servidor al conectar con Drive." });
    }
  });

  // API routes for Google Sheets sync
  app.get("/api/sync/get", async (req, res) => {
    try {
      const globalData = await fetchFromSheets();
      res.json(globalData);
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/sync/push", async (req, res) => {
    try {
      const globalData = req.body;
      
      // LOG TO DEBUG MISSING DATA
      if (globalData && globalData.users) {
         for (const [user, data] of Object.entries(globalData.users)) {
            console.log(`[PUSH] User: ${user}`);
            const t = (data as any).tks?.find((t: any) => t.text === 'prueba piloto');
            if (t) console.log(`[PUSH] "prueba piloto" subtasks:`, t.subtasks);
            
            const firstRoutineStr = Object.keys((data as any).rtS || {})[0];
            if (firstRoutineStr) {
               console.log(`[PUSH] First routine note:`, (data as any).rtS[firstRoutineStr]?.note);
            }
         }
      }
      
      await pushToSheets(globalData);
      res.json({ success: true });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });



// Export the app for Vercel Serverless Function
export default app;
