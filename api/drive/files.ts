import type { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';

// --- CONFIGURACIÓN ---
const TARGET_FOLDER_ID = '1iniK-YPZ8BYac8YeK_Uu5_EWxcC0UPH6'; // Hardcoded folder ID

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Solo permitir GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const SERVICE_ACCOUNT_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

    if (!SERVICE_ACCOUNT_KEY) {
      return res.status(500).json({ error: "Falta la configuración de la Cuenta de Servicio (GOOGLE_SERVICE_ACCOUNT_KEY)." });
    }

    const folderId = req.query.folderId as string || TARGET_FOLDER_ID;

    let credentials;
    try {
      // Intentar parsear directamente
      credentials = JSON.parse(SERVICE_ACCOUNT_KEY);
    } catch (e1) {
      try {
        // Si falla, intentar reemplazar saltos de línea escapados y comillas extra
        // Vercel a veces guarda el JSON con saltos de línea literales (\n)
        let cleanedKey = SERVICE_ACCOUNT_KEY;
        if (cleanedKey.startsWith('"') && cleanedKey.endsWith('"')) {
          cleanedKey = cleanedKey.slice(1, -1);
        }
        cleanedKey = cleanedKey.replace(/\\n/g, '\n');
        credentials = JSON.parse(cleanedKey);
      } catch (e2) {
        return res.status(500).json({ error: "El formato de la llave de servicio (JSON) es inválido. Asegúrate de pegar el JSON completo sin comillas extra." });
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
      // Solo truncar si NO se solicita el documento completo
      const isFullRequested = req.query.full === 'true';
      if (!isFullRequested && fullContext.length > 100000) {
          fullContext = fullContext.substring(0, 100000) + "\n\n...[CONTENIDO TRUNCADO POR LÍMITE DE TAMAÑO DE LA API. ACTIVA EL MODO COMPLETO EN CONFIGURACIÓN]...";
      }

    } else {
      fullContext += `\n[ADVERTENCIA: Carpeta vacía o sin Google Docs].\n`;
    }

    return res.status(200).json({ context: fullContext });

  } catch (error: any) {
    console.error("Error en /api/drive/files:", error);
    return res.status(500).json({ error: error.message || "Error interno del servidor al conectar con Drive." });
  }
}
