import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Bell,
  Menu,
  User,
  LogOut,
  ChevronDown,
  Sparkles,
  Settings,
  CheckCircle,
  Moon,
  Sun,
  X,
  Loader2,
} from 'lucide-react';
import { aiService } from '../services/apiService';

const PAGE_TITLES = {
  '/dashboard':   { label: 'Dashboard',       subtitle: 'Resumen general del negocio' },
  '/pos':         { label: 'Punto de Venta',   subtitle: 'Gestión de ventas en mostrador' },
  '/almacen':     { label: 'Almacén',          subtitle: 'Control de inventario y stock' },
  '/reportes':    { label: 'Reportes',         subtitle: 'Análisis y métricas del negocio' },
  '/analitica':   { label: 'Analítica',        subtitle: 'Dashboards interactivos con Metabase' },
  '/facturacion': { label: 'Facturación',      subtitle: 'Facturas y documentos fiscales' },
  '/cobranza':    { label: 'Cobranza',         subtitle: 'Cuentas por cobrar y pagos' },
};

const MOCK_NOTIFICATIONS = [
  { id: 1, icon: CheckCircle, color: '#10b981', text: 'Stock bajo en 3 productos', time: 'hace 5 min' },
  { id: 2, icon: Bell,        color: '#f59e0b', text: '2 facturas pendientes de timbrar', time: 'hace 1 h' },
  { id: 3, icon: Bell,        color: '#3b82f6', text: 'Reporte semanal disponible', time: 'hace 3 h' },
];

function TopNavbar({ mobileOpen, setMobileOpen }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notiOpen, setNotiOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // IA state
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [aiError, setAiError] = useState('');
  const [lastQuery, setLastQuery] = useState('');

  const userMenuRef = useRef(null);
  const notiRef = useRef(null);
  const searchWrapperRef = useRef(null);

  const pageInfo = PAGE_TITLES[location.pathname] || { label: 'ERP', subtitle: '' };

  const userInitials = user?.username
    ? user.username.slice(0, 2).toUpperCase()
    : 'US';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Dark mode global (persistente)
  useEffect(() => {
    const saved = localStorage.getItem('erp-theme');
    const enabled = saved === 'dark';
    setIsDarkMode(enabled);
    document.documentElement.dataset.theme = enabled ? 'dark' : 'light';
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      localStorage.setItem('erp-theme', next ? 'dark' : 'light');
      document.documentElement.dataset.theme = next ? 'dark' : 'light';
      return next;
    });
  };

  // Cierra dropdowns al click fuera
  useEffect(() => {
    const handler = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
      if (notiRef.current && !notiRef.current.contains(e.target)) {
        setNotiOpen(false);
      }
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target)) {
        setAiPanelOpen(false);
        setSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Cerrar panel IA con Escape
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') {
        setAiPanelOpen(false);
        setSearchFocused(false);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const handleAiQuery = useCallback(async (query) => {
    if (!query.trim()) return;
    setLastQuery(query);
    setAiLoading(true);
    setAiError('');
    setAiResponse('');
    setAiPanelOpen(true);

    try {
      const result = await aiService.chat(query, {
        modulo_actual: pageInfo.label,
        usuario: user?.username,
        rol: user?.rol,
      });
      setAiResponse(result.response);
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Error al conectar con el asistente IA.';
      setAiError(msg);
    } finally {
      setAiLoading(false);
    }
  }, [pageInfo.label, user]);

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter' && searchValue.trim()) {
      handleAiQuery(searchValue);
    }
  };

  const closeAiPanel = () => {
    setAiPanelOpen(false);
    setAiResponse('');
    setAiError('');
  };

  return (
    <header className="erp-topnav">
      <div className="erp-topnav__left">
        {/* Mobile toggle */}
        <button
          className="erp-topnav__menu-btn d-flex d-md-none"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Menú"
        >
          <Menu size={20} />
        </button>

        {/* Título de página */}
        <div className="erp-topnav__page-info">
          <h1 className="erp-topnav__page-title">{pageInfo.label}</h1>
          {pageInfo.subtitle && (
            <p className="erp-topnav__page-sub">{pageInfo.subtitle}</p>
          )}
        </div>
      </div>

      <div className="erp-topnav__center">
        {/* Searchbar + AI Panel wrapper */}
        <div className="erp-topnav__search-wrapper" ref={searchWrapperRef}>
          <motion.div
            className={`erp-topnav__search ${searchFocused ? 'erp-topnav__search--focused' : ''}`}
            animate={{ width: searchFocused ? 420 : 320 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          >
            <Search size={16} className="erp-topnav__search-icon" />
            <input
              type="text"
              className="erp-topnav__search-input"
              placeholder="Buscar o preguntarle al asistente IA…"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onKeyDown={handleSearchKeyDown}
            />
            <AnimatePresence>
              {searchFocused && (
                <motion.div
                  className="erp-topnav__search-badge"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  <Sparkles size={11} />
                  IA
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Panel de respuesta IA */}
          <AnimatePresence>
            {aiPanelOpen && (
              <motion.div
                className="erp-ai-panel"
                initial={{ opacity: 0, y: -8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                transition={{ duration: 0.2 }}
              >
                <div className="erp-ai-panel__header">
                  <div className="erp-ai-panel__title">
                    <Sparkles size={14} />
                    Asistente IA
                  </div>
                  <button className="erp-ai-panel__close" onClick={closeAiPanel} aria-label="Cerrar">
                    <X size={14} />
                  </button>
                </div>

                {lastQuery && (
                  <div className="erp-ai-panel__query">
                    <Search size={12} />
                    {lastQuery}
                  </div>
                )}

                <div className="erp-ai-panel__body">
                  {aiLoading && (
                    <div className="erp-ai-panel__loading">
                      <Loader2 size={18} className="erp-ai-panel__spinner" />
                      <span>Consultando al asistente…</span>
                    </div>
                  )}
                  {aiError && !aiLoading && (
                    <p className="erp-ai-panel__error">{aiError}</p>
                  )}
                  {aiResponse && !aiLoading && (
                    <p className="erp-ai-panel__response">{aiResponse}</p>
                  )}
                </div>

                {!aiLoading && (
                  <div className="erp-ai-panel__footer">
                    Presiona <kbd>Enter</kbd> para nueva consulta · <kbd>Esc</kbd> para cerrar
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="erp-topnav__right">
        {/* Modo oscuro */}
        <button
          className="erp-topnav__icon-btn"
          onClick={toggleDarkMode}
          aria-label={isDarkMode ? 'Desactivar modo oscuro' : 'Activar modo oscuro'}
          title={isDarkMode ? 'Modo claro' : 'Modo oscuro'}
        >
          {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Notificaciones */}
        <div className="erp-topnav__action-group" ref={notiRef}>
          <button
            className="erp-topnav__icon-btn"
            onClick={() => { setNotiOpen(!notiOpen); setUserMenuOpen(false); }}
            aria-label="Notificaciones"
          >
            <Bell size={18} />
            <span className="erp-topnav__badge">3</span>
          </button>

          <AnimatePresence>
            {notiOpen && (
              <motion.div
                className="erp-topnav__dropdown erp-topnav__dropdown--noti"
                initial={{ opacity: 0, y: -8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                transition={{ duration: 0.18 }}
              >
                <div className="erp-dropdown__header">
                  <span>Notificaciones</span>
                  <span className="erp-dropdown__count">{MOCK_NOTIFICATIONS.length} nuevas</span>
                </div>
                {MOCK_NOTIFICATIONS.map((n) => {
                  const Icon = n.icon;
                  return (
                    <div key={n.id} className="erp-dropdown__noti-item">
                      <div className="erp-dropdown__noti-icon" style={{ color: n.color }}>
                        <Icon size={16} />
                      </div>
                      <div className="erp-dropdown__noti-body">
                        <span>{n.text}</span>
                        <small>{n.time}</small>
                      </div>
                    </div>
                  );
                })}
                <div className="erp-dropdown__footer">Ver todas las notificaciones</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Cluster de usuario */}
        <div className="erp-topnav__action-group" ref={userMenuRef}>
          <button
            className="erp-topnav__user-cluster"
            onClick={() => { setUserMenuOpen(!userMenuOpen); setNotiOpen(false); }}
            aria-label="Menú de usuario"
          >
            <div className="erp-topnav__avatar">{userInitials}</div>
            <div className="erp-topnav__user-info d-none d-sm-flex">
              <span className="erp-topnav__username">{user?.username || 'Usuario'}</span>
              <span className="erp-topnav__role">{user?.rol || 'N/A'}</span>
            </div>
            <ChevronDown
              size={14}
              className={`erp-topnav__chevron ${userMenuOpen ? 'erp-topnav__chevron--open' : ''}`}
            />
          </button>

          <AnimatePresence>
            {userMenuOpen && (
              <motion.div
                className="erp-topnav__dropdown erp-topnav__dropdown--user"
                initial={{ opacity: 0, y: -8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                transition={{ duration: 0.18 }}
              >
                <div className="erp-dropdown__user-header">
                  <div className="erp-topnav__avatar erp-topnav__avatar--lg">{userInitials}</div>
                  <div>
                    <strong>{user?.username || 'Usuario'}</strong>
                    <small>{user?.rol || 'N/A'}</small>
                  </div>
                </div>

                <div className="erp-dropdown__divider" />

                <button className="erp-dropdown__item">
                  <User size={15} />
                  Mi perfil
                </button>
                <button className="erp-dropdown__item">
                  <Settings size={15} />
                  Configuración
                </button>

                <div className="erp-dropdown__divider" />

                <button className="erp-dropdown__item erp-dropdown__item--danger" onClick={handleLogout}>
                  <LogOut size={15} />
                  Cerrar sesión
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}

export default TopNavbar;
