import React, { useState, useEffect } from 'react';
import LoginScreen from './components/LoginScreen';
import Dashboard from './components/Dashboard';
import AdminDashboard from './components/AdminDashboard';

function App() {
  const [currentUser, setCurrentUser] = useState<string | null>(() => {
    return localStorage.getItem("v25_current_session");
  });

  // Estado para controlar qué vista se muestra (solo para admins)
  const [isAdminView, setIsAdminView] = useState(false);

  // Lista de usuarios con privilegios de administrador
  const ADMIN_USERS = ['admin', 'nicolas.andreola'];

  const handleLogin = (username: string) => {
    setCurrentUser(username);
    localStorage.setItem("v25_current_session", username);
    setIsAdminView(false); // Siempre entrar primero al personal por defecto (o cambiar a true si prefieres)
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("v25_current_session");
    setIsAdminView(false);
  };

  // If no user is logged in, show login screen
  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  const isSuperUser = ADMIN_USERS.includes(currentUser.toLowerCase());

  // ADMIN DASHBOARD VIEW
  if (isSuperUser && isAdminView) {
    return (
      <AdminDashboard 
        onLogout={handleLogout} 
        onSwitchToPersonal={() => setIsAdminView(false)}
        currentUser={currentUser}
      />
    );
  }

  // STANDARD / PERSONAL DASHBOARD VIEW
  return (
    <Dashboard 
      key={currentUser} 
      user={currentUser} 
      onLogout={handleLogout}
      onSwitchToAdmin={isSuperUser ? () => setIsAdminView(true) : undefined}
    />
  );
}

export default App;