import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import Login from './pages/Login/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import POS from './pages/POS/POS';
import Almacen from './pages/Almacen/Almacen';
import Reportes from './pages/Reportes/Reportes';
import Facturacion from './pages/Facturacion/Facturacion';
import Cobranza from './pages/Cobranza/Cobranza';
import Analitica from './pages/Analitica/Analitica';
import RRHH from './pages/RRHH/RRHH';
import NotFound from './pages/NotFound/NotFound';
import './App.css';

function AppRoutes() {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Cargando...</p>
      </div>
    );
  }

  // Área pública (no autenticado)
  if (!token) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    );
  }

  // Área privada (autenticado) con Layout persistente
  return (
    <Layout>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/pos" element={<POS />} />
        <Route path="/almacen" element={<Almacen />} />
        <Route path="/reportes" element={<Reportes />} />
        <Route path="/analitica" element={<Analitica />} />
        <Route path="/facturacion" element={<Facturacion />} />
        <Route path="/cobranza" element={<Cobranza />} />
        <Route path="/rrhh" element={<RRHH />} />
        <Route path="/" element={<Navigate to="/dashboard" />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <div className="App">
            <AppRoutes />
          </div>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
