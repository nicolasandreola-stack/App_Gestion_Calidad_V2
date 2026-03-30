import React, { useState } from 'react';
import { User, Lock, ArrowRight, UserPlus, LogIn, AlertCircle } from 'lucide-react';

interface LoginScreenProps {
  onLogin: (username: string) => void;
}

// VERSION CONTROL (Synced with Personal Dashboard)
const LAST_UPDATE = new Date().toLocaleString('es-ES', { 
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' 
});

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const logoUrl = "https://drive.google.com/thumbnail?id=1BkFrIklMROkiE8ekHz3UpWjw7Yoo58dW&sz=h200"; 

  // Simple hash para no guardar texto plano (básico para frontend)
  const hashPassword = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const userClean = username.trim().toLowerCase();
    const passClean = password.trim();

    if (!userClean || !passClean) {
      setError("Por favor completa todos los campos");
      return;
    }

    // Obtener base de datos de usuarios
    const usersDb = JSON.parse(localStorage.getItem('v25_auth_users') || '{}');

    if (isRegistering) {
      // LOGICA DE REGISTRO
      if (usersDb[userClean]) {
        setError("Este usuario ya existe. Intenta iniciar sesión.");
        return;
      }
      // Guardar nuevo usuario
      usersDb[userClean] = hashPassword(passClean);
      localStorage.setItem('v25_auth_users', JSON.stringify(usersDb));
      
      // Auto-login
      onLogin(userClean);
    } else {
      // LOGICA DE LOGIN
      if (!usersDb[userClean]) {
        setError("Usuario no encontrado. Crea una cuenta.");
        return;
      }
      if (usersDb[userClean] !== hashPassword(passClean)) {
        setError("Contraseña incorrecta.");
        return;
      }
      // Login exitoso
      onLogin(userClean);
    }
  };

  return (
    <div className="min-h-screen bg-bgBody flex flex-col justify-between p-4 relative overflow-y-auto">
      
      {/* Spacer to push content to center */}
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
              {isRegistering ? "Crear nueva cuenta" : "Gestión de tareas"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* User Input */}
            <div>
              <label className="block text-xs font-bold text-textSecondary uppercase mb-1.5 ml-1">
                Usuario
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Nombre de usuario"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-borderLight rounded-xl outline-none focus:border-accentBlue focus:bg-white transition-all text-textPrimary text-sm"
                  autoFocus
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-xs font-bold text-textSecondary uppercase mb-1.5 ml-1">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-borderLight rounded-xl outline-none focus:border-accentBlue focus:bg-white transition-all text-textPrimary text-sm"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 p-2 rounded-lg border border-red-100">
                <AlertCircle size={14} />
                {error}
              </div>
            )}

            <button 
              type="submit" 
              className={`mt-2 text-white py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 group shadow-sm ${isRegistering ? 'bg-accentGreen hover:bg-green-700' : 'bg-accentBlue hover:bg-blue-700'}`}
            >
              {isRegistering ? (
                <>Crear Cuenta <UserPlus size={18} /></>
              ) : (
                <>Ingresar <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" /></>
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-gray-100 flex justify-center">
            <button 
              onClick={() => { setIsRegistering(!isRegistering); setError(null); }}
              className="text-xs text-textSecondary hover:text-accentBlue font-medium transition-colors flex items-center gap-1.5"
            >
              {isRegistering ? (
                <>¿Ya tienes cuenta? <span className="underline">Inicia Sesión</span></>
              ) : (
                <>¿Eres nuevo? <span className="underline">Regístrate aquí</span></>
              )}
            </button>
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