import React, { useState, useEffect } from 'react';
import LoginScreen from './components/LoginScreen';
import Dashboard from './components/Dashboard';
import AdminDashboard from './components/AdminDashboard';
import GlobalSearchModal from './components/GlobalSearchModal';

function App() {
  const [currentUser, setCurrentUser] = useState<string | null>(() => {
    return localStorage.getItem("v25_current_session");
  });

  // Estado para controlar qué vista se muestra (solo para admins)
  const [isAdminView, setIsAdminView] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Escuchar atajo global Ctrl+K o Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
  let mainContent;
  if (isSuperUser && isAdminView) {
    mainContent = (
      <AdminDashboard 
        onLogout={handleLogout} 
        onSwitchToPersonal={() => setIsAdminView(false)}
        currentUser={currentUser}
        onOpenSearch={() => setIsSearchOpen(true)}
      />
    );
  } else {
    // STANDARD / PERSONAL DASHBOARD VIEW
    mainContent = (
      <Dashboard 
        key={currentUser} 
        user={currentUser} 
        onLogout={handleLogout}
        onSwitchToAdmin={isSuperUser ? () => setIsAdminView(true) : undefined}
        onOpenSearch={() => setIsSearchOpen(true)}
      />
    );
  }

  return (
    <>
      <GlobalSearchModal 
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)} 
        isAdmin={isSuperUser} 
        currentUser={currentUser} 
      />
      {mainContent}
    </>
  );
}

export default App;