import { OAuth2Client } from "google-auth-library";
import type { Request, Response, NextFunction } from "express";

// Shared with the client's VITE_GOOGLE_CLIENT_ID — dotenv loads the whole .env
// file into process.env regardless of the VITE_ prefix, so no separate server
// env var is needed.
const GOOGLE_CLIENT_ID = process.env.VITE_GOOGLE_CLIENT_ID;
const ALLOWED_EMAIL_DOMAIN = "@gemez.com.ar";

const oauthClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

export interface AuthedUser {
    email: string;
    username: string;
}

// Verifies the Google ID token sent as `Authorization: Bearer <token>`. Checks
// the signature, that it was issued for our client, that it hasn't expired,
// and that the email is on the allowed company domain — the same check the
// login screen does, but enforced here where it can't be bypassed by calling
// the API directly instead of going through the UI.
async function verifyRequestAuth(req: Request): Promise<AuthedUser | null> {
    if (!oauthClient) return null;

    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) return null;
    const idToken = header.slice("Bearer ".length);

    try {
        const ticket = await oauthClient.verifyIdToken({ idToken, audience: GOOGLE_CLIENT_ID });
        const payload = ticket.getPayload();
        const email = payload?.email?.toLowerCase();
        if (!email) return null;
        if (!email.endsWith(ALLOWED_EMAIL_DOMAIN)) return null;
        return { email, username: email.split("@")[0] };
    } catch {
        // Expired, malformed, or forged token.
        return null;
    }
}

// Express middleware: rejects the request with 401 unless it carries a valid,
// non-expired Google ID token for an @gemez.com.ar account.
export function requireAuth() {
    return async (req: Request, res: Response, next: NextFunction) => {
        const user = await verifyRequestAuth(req);
        if (!user) {
            res.status(401).json({ error: "UNAUTHORIZED", message: "Sesión inválida o vencida. Volvé a iniciar sesión." });
            return;
        }
        (req as any).authedUser = user;
        next();
    };
}
