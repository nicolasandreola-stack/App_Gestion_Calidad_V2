import React, { useState, useEffect, Suspense, lazy } from 'react';
import LoginScreen from './components/LoginScreen';
import AppSidebar, { AppView } from './components/AppSidebar';
import { Toaster } from 'sonner';

// Code-split per view: a regular team member never downloads the Admin/Gantt
// bundle (the biggest chunk in the app), and vice versa for an admin who
// never visits the plain task dashboard.
const Dashboard = lazy(() => import('./components/Dashboard'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const DesviosDashboard = lazy(() => import('./components/DesviosDashboard'));
const GlobalSearchModal = lazy(() => import('./components/GlobalSearchModal'));

const ViewLoadingFallback = () => (
  <div className="flex-1 flex items-center justify-center text-textSecondary text-sm">
    Cargando...
  </div>
);

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
    return (
      <>
        <Toaster richColors position="top-right" />
        <LoginScreen onLogin={handleLogin} />
      </>
    );
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
  } else if (safeView === 'gantt') {
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
  } else if (safeView === 'desvios') {
    mainContent = <DesviosDashboard />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-bgBody">
      <Toaster richColors position="top-right" />
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
        <Suspense fallback={<ViewLoadingFallback />}>
          {isSearchOpen && (
            <GlobalSearchModal
              isOpen={isSearchOpen}
              onClose={() => setIsSearchOpen(false)}
              isAdmin={isSuperUser}
              currentUser={currentUser}
            />
          )}
          {mainContent}
        </Suspense>
      </div>
    </div>
  );
}

export default App;