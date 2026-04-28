import React, { useState, useEffect } from 'react';
import LoginScreen from './components/LoginScreen';
import Dashboard from './components/Dashboard';
import AdminDashboard from './components/AdminDashboard';
import GlobalSearchModal from './components/GlobalSearchModal';
import AppSidebar, { AppView } from './components/AppSidebar';

function App() {
  const [currentUser, setCurrentUser] = useState<string | null>(() => {
    return localStorage.getItem("v25_current_session");
  });

  const [activeView, setActiveView] = useState<AppView>('tasks');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showAssistant, setShowAssistant] = useState(false);
  const [showTokenHelp, setShowTokenHelp] = useState(false);

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
    setActiveView('tasks');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("v25_current_session");
    setActiveView('tasks');
  };

  // If no user is logged in, show login screen
  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  const isSuperUser = ADMIN_USERS.includes(currentUser.toLowerCase());

  // Si un no-admin intenta acceder a vistas admin, fallback a tasks
  const safeView: AppView = (!isSuperUser && (activeView === 'team' || activeView === 'gantt'))
    ? 'tasks'
    : activeView;

  // Render del panel de contenido según la vista activa
  let mainContent;
  if (safeView === 'tasks') {
    mainContent = (
      <Dashboard
        key={currentUser}
        user={currentUser}
        onLogout={handleLogout}
        onOpenSearch={() => setIsSearchOpen(true)}
        showAssistant={showAssistant}
        onCloseAssistant={() => setShowAssistant(false)}
      />
    );
  } else if (safeView === 'team') {
    mainContent = (
      <AdminDashboard
        onLogout={handleLogout}
        currentUser={currentUser}
        onOpenSearch={() => setIsSearchOpen(true)}
        initialTab="asignaciones"
        showTokenHelpExternal={showTokenHelp}
        onCloseTokenHelpExternal={() => setShowTokenHelp(false)}
      />
    );
  } else {
    // gantt
    mainContent = (
      <AdminDashboard
        onLogout={handleLogout}
        currentUser={currentUser}
        onOpenSearch={() => setIsSearchOpen(true)}
        initialTab="gantt"
        showTokenHelpExternal={showTokenHelp}
        onCloseTokenHelpExternal={() => setShowTokenHelp(false)}
      />
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-bgBody">
      {/* Sidebar de navegación global */}
      <AppSidebar
        activeView={safeView}
        onNavigate={setActiveView}
        isAdmin={isSuperUser}
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenAssistant={() => setShowAssistant(true)}
        onShowTokenHelp={isSuperUser ? () => setShowTokenHelp(true) : undefined}
      />

      {/* Área de contenido principal */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <GlobalSearchModal
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          isAdmin={isSuperUser}
          currentUser={currentUser}
        />
        {mainContent}
      </div>
    </div>
  );
}

export default App;