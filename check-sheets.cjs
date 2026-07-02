const { google } = require('googleapis');
const { GoogleAuth } = require('google-auth-library');

async function check() {
    const auth = new GoogleAuth({
        keyFile: 'google-credentials.json',
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    const sheets = google.sheets({ version: 'v4', auth });
    
    const tareasRes = await sheets.spreadsheets.values.get({
        spreadsheetId: "1yRf1a_wtB0ZM9Q5o0HO0ARQVd5bHBCoGjEiZdfuxlfs",
        range: "Tareas!A1:H3"
    });
    console.log("TAREAS:");
    console.log(tareasRes.data.values);

    const rutinasRes = await sheets.spreadsheets.values.get({
        spreadsheetId: "1yRf1a_wtB0ZM9Q5o0HO0ARQVd5bHBCoGjEiZdfuxlfs",
        range: "Rutinas!A1:G5"
    });
    console.log("\nRUTINAS:");
    console.log(rutinasRes.data.values);
}
check().catch(console.error);
