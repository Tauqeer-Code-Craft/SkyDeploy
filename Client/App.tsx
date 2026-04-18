import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { checkHealth } from './services/api';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Databases from './pages/Databases';
import AppDetails from './pages/AppDetails';
import { Login, Register } from './pages/Auth';
import Documentation from './pages/Documentation';
import { Cloud, LogOut, User as UserIcon, Activity, Database, LayoutGrid, BookOpen } from 'lucide-react';
import { Button } from './components/UI';

const ProtectedRoute = ({ children }: React.PropsWithChildren) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

const Navbar = () => {
  const { isAuthenticated, logout } = useAuth();
  const [health, setHealth] = useState<boolean>(true);
  const location = useLocation();
  const isLanding = location.pathname === '/';

  useEffect(() => {
    // Simple health check polling
    const interval = setInterval(async () => {
      const isOk = await checkHealth();
      setHealth(isOk);
    }, 60000);
    checkHealth().then(setHealth);
    return () => clearInterval(interval);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-40 border-b border-zinc-800/50 backdrop-blur-md ${isLanding ? 'bg-black/50' : 'bg-black/80'}`}>
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg tracking-tight">
            <Cloud className="h-5 w-5 text-white" />
            <span>SkyDeploy</span>
          </Link>

          {isAuthenticated && (
            <div className="hidden md:flex items-center gap-6 text-sm font-medium">
              <Link 
                to="/dashboard" 
                className={`flex items-center gap-2 hover:text-white transition-colors ${location.pathname === '/dashboard' ? 'text-white' : 'text-zinc-400'}`}
              >
                <LayoutGrid className="h-4 w-4" /> Dashboard
              </Link>
              <Link 
                to="/databases" 
                className={`flex items-center gap-2 hover:text-white transition-colors ${location.pathname === '/databases' ? 'text-white' : 'text-zinc-400'}`}
              >
                <Database className="h-4 w-4" /> Databases
              </Link>
            </div>
          )}

          {!isAuthenticated && !isLanding && (
            <div className="hidden md:flex items-center gap-6 text-sm font-medium">
               <Link 
                to="/docs" 
                className={`flex items-center gap-2 hover:text-white transition-colors ${location.pathname === '/docs' ? 'text-white' : 'text-zinc-400'}`}
              >
                <BookOpen className="h-4 w-4" /> Documentation
              </Link>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 text-xs font-mono text-zinc-500 border border-zinc-800 rounded-full px-3 py-1 bg-zinc-900/50">
            <Activity className={`h-3 w-3 ${health ? 'text-green-500' : 'text-red-500'}`} />
            System: {health ? 'Operational' : 'Issues'}
          </div>

          {isAuthenticated ? (
            <div className="flex items-center gap-4">
              <Button variant="ghost" className="h-8 w-8 p-0 rounded-full bg-zinc-800">
                <UserIcon className="h-4 w-4" />
              </Button>
              <Button variant="secondary" className="h-8 text-xs" onClick={logout}>
                <LogOut className="h-3 w-3 mr-2" /> Logout
              </Button>
            </div>
          ) : (
            !isLanding && (
              <Link to="/login">
                <Button variant="secondary" className="h-8 text-xs">Login</Button>
              </Link>
            )
          )}
        </div>
      </div>
    </nav>
  );
};

const Layout = ({ children }: React.PropsWithChildren) => (
  <div className="min-h-screen pt-16">
    <Navbar />
    {children}
  </div>
);

const App = () => {
  return (
    <AuthProvider>
      <HashRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/docs" element={<Documentation />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
             <Route 
              path="/apps/:appName" 
              element={
                <ProtectedRoute>
                  <AppDetails />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/databases" 
              element={
                <ProtectedRoute>
                  <Databases />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </Layout>
      </HashRouter>
    </AuthProvider>
  );
};

export default App;