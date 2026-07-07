import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { setStoredIdToken } from '../syncClient';

interface LoginScreenProps {
  onLogin: (username: string) => void;
}

// VERSION CONTROL (Synced with Personal Dashboard)
const LAST_UPDATE = new Date().toLocaleString('es-ES', { 
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' 
});

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [error, setError] = useState<string | null>(null);
  const googleButtonRef = useRef<HTMLDivElement>(null);

  const logoUrl = "https://drive.google.com/thumbnail?id=1BkFrIklMROkiE8ekHz3UpWjw7Yoo58dW&sz=h200"; 

  const decodeJwt = (token: string) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (e) {
      return null;
    }
  };

  useEffect(() => {
    // Si ya existe la librería cargada
    if (window.google?.accounts?.id) {
      initializeGoogleSignIn();
    } else {
      // Intentar después si el script tardó en cargar
      const timeout = setTimeout(() => {
        if (window.google?.accounts?.id) {
          initializeGoogleSignIn();
        } else {
          setError("No se pudo cargar Google Sign-In. Revisa tu conexión.");
        }
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, []);

  const initializeGoogleSignIn = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      setError("Falta configurar el VITE_GOOGLE_CLIENT_ID en el archivo .env");
      return;
    }

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: handleCredentialResponse,
    });

    if (googleButtonRef.current) {
      window.google.accounts.id.renderButton(
        googleButtonRef.current,
        { theme: 'outline', size: 'large', width: 300, shape: 'pill' }
      );
    }
  };

  const handleCredentialResponse = (response: any) => {
    const payload = decodeJwt(response.credential);
    if (!payload || !payload.email) {
      setError("Hubo un problema al leer tu cuenta de Google.");
      return;
    }

    const email: string = payload.email.toLowerCase();

    if (!email.endsWith('@gemez.com.ar')) {
      setError("Solo se permiten cuentas de @gemez.com.ar");
      return;
    }

    // Cortamos la parte antes del @ para mapear con la base de datos de Sheets
    // Ej: nicolas.andreola@gemez.com.ar -> nicolas.andreola
    const username = email.split('@')[0];

    // Guardamos el token: la API lo vuelve a verificar en cada pedido, esto
    // solo evita que alguien salte el login llamando a la API directamente.
    setStoredIdToken(response.credential);

    // Iniciamos sesión con el usuario ya mapeado
    onLogin(username);
  };

  return (
    <div className="min-h-screen bg-bgBody flex flex-col justify-between p-4 relative overflow-y-auto">
      <div className="flex-1 flex flex-col items-center justify-center w-full">
        <div className="bg-white rounded-2xl shadow-xl border border-borderLight p-8 w-full max-w-sm animate-in zoom-in-95 duration-300">
          <div className="flex flex-col items-center mb-6">
            <img 
              src={logoUrl} 
              alt="Logo" 
              className="h-16 w-auto object-contain mb-4"
              referrerPolicy="no-referrer"
            />
            <h1 className="text-2xl font-bold text-textPrimary text-center uppercase tracking-tight">CALIDAD Y TECNOLOGÍA</h1>
            <p className="text-sm text-textSecondary mt-1 text-center font-medium">
              Gestión de tareas
            </p>
          </div>

          <div className="flex flex-col items-center gap-4 mt-6">
            <p className="text-xs font-bold text-textSecondary uppercase text-center mb-2">
              Ingresá con tu cuenta
            </p>
            
            <div ref={googleButtonRef} className="flex justify-center w-full min-h-[44px]"></div>

            {error && (
              <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 p-3 rounded-lg border border-red-100 mt-2 w-full">
                <AlertCircle size={16} className="shrink-0" />
                <span className="leading-tight">{error}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 text-center text-[10px] text-gray-500 font-mono leading-tight opacity-80">
         <div>APP Gestor de tareas (creada por Nicolas Andreola)</div>
         <div>Última modificación: {LAST_UPDATE}</div>
      </div>
    </div>
  );
};

export default LoginScreen;