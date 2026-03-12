import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Store,
  LayoutDashboard,
  ShoppingCart,
  Package,
  Receipt,
  Wallet,
  LogOut,
  ChevronLeft,
  ChevronRight,
  X,
  TrendingUp,
  BarChart3,
  Users
} from 'lucide-react';

const navItems = [
  { path: '/dashboard',   label: 'Dashboard',         icon: LayoutDashboard, section: 'principal'  },
  { path: '/pos',         label: 'Punto de Venta',     icon: ShoppingCart,    section: 'principal'  },
  { path: '/almacen',     label: 'Almacén',            icon: Package,         section: 'inventario' },
  { path: '/reportes',    label: 'Reportes',           icon: TrendingUp,      section: 'analítica'  },
  { path: '/analitica',   label: 'Analítica',          icon: BarChart3,       section: 'analítica'  },
  { path: '/facturacion', label: 'Facturación',        icon: Receipt,         section: 'finanzas'   },
  { path: '/cobranza',    label: 'Cobranza',           icon: Wallet,          section: 'finanzas'   },
  { path: '/rrhh',        label: 'Recursos Humanos',   icon: Users,           section: 'rrhh'       },
];

const sectionLabels = {
  principal:  'Principal',
  inventario: 'Inventario',
  'analítica':'Analítica',
  finanzas:   'Finanzas',
  rrhh:       'RRHH',
};

function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [hoveredItem, setHoveredItem] = useState(null);

  const isActive = (path) => location.pathname === path;

  const groupedNav = navItems.reduce((acc, item) => {
    if (!acc[item.section]) acc[item.section] = [];
    acc[item.section].push(item);
    return acc;
  }, {});

  const userInitials = user?.username
    ? user.username.slice(0, 2).toUpperCase()
    : 'US';

  return (
    <>
      {/* Overlay en mobile (Bootstrap-style: simple capa fija) */}
      {mobileOpen && (
        <div
          className="erp-sidebar-overlay"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar fijo usando utilidades de Bootstrap + CSS propio */}
      <aside
        className={`erp-sidebar${collapsed ? ' erp-sidebar--collapsed' : ''}${
          mobileOpen ? ' erp-sidebar--mobile-open' : ''
        } d-flex flex-column`}
      >
        <div className="erp-sidebar__inner">
          {/* ── Header / Logo ── */}
          <div className="erp-sidebar__header">
            <Link to="/dashboard" className="erp-sidebar__logo" tabIndex={-1}>
              <div className="erp-sidebar__logo-icon">
                <Store size={20} strokeWidth={2.2} />
              </div>
              {!collapsed && (
                <div className="erp-sidebar__logo-text">
                  <span className="erp-sidebar__brand">ERP</span>
                  <span className="erp-sidebar__brand-sub">Sistema POS</span>
                </div>
              )}
            </Link>

            {/* Botón colapsar (desktop) */}
            <button
              className="erp-sidebar__collapse-btn d-none d-md-flex"
              onClick={() => setCollapsed(!collapsed)}
              aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
            >
              {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
            </button>

            {/* Botón cerrar (mobile) */}
            <button
              className="erp-sidebar__collapse-btn d-flex d-md-none"
              onClick={() => setMobileOpen(false)}
              aria-label="Cerrar menú"
            >
              <X size={15} />
            </button>
          </div>

          {/* ── Navegación ── */}
          <nav className="erp-sidebar__nav">
            {Object.entries(groupedNav).map(([section, items]) => (
              <div key={section} className="erp-sidebar__section">
                {!collapsed && (
                  <span className="erp-sidebar__section-label">
                    {sectionLabels[section]}
                  </span>
                )}

                {items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  return (
                    <div
                      key={item.path}
                      className="erp-sidebar__link-wrapper"
                      onMouseEnter={() => setHoveredItem(item.path)}
                      onMouseLeave={() => setHoveredItem(null)}
                    >
                      <Link
                        to={item.path}
                        className={`erp-sidebar__link${
                          active ? ' erp-sidebar__link--active' : ''
                        }`}
                      >
                        {active && (
                          <div
                            className="erp-sidebar__active-indicator"
                            aria-hidden="true"
                          />
                        )}
                        <span className="erp-sidebar__link-icon">
                          <Icon size={19} strokeWidth={active ? 2.2 : 1.8} />
                        </span>
                        {!collapsed && (
                          <span className="erp-sidebar__link-label">
                            {item.label}
                          </span>
                        )}
                      </Link>

                      {/* Tooltip sólo en modo colapsado */}
                      {collapsed && hoveredItem === item.path && (
                        <div className="erp-sidebar__tooltip">
                          {item.label}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* ── Footer / Usuario ── */}
          <div className="erp-sidebar__footer">
            <div className="erp-sidebar__user">
              <div className="erp-sidebar__avatar">{userInitials}</div>
              {!collapsed && (
                <div className="erp-sidebar__user-info">
                  <span className="erp-sidebar__username">
                    {user?.username || 'Usuario'}
                  </span>
                  <span className="erp-sidebar__role">{user?.rol || 'N/A'}</span>
                </div>
              )}
            </div>

            <button
              className="erp-sidebar__logout btn btn-sm btn-block text-start d-flex align-items-center gap-2"
              onClick={() => {
                logout();
              }}
              title="Cerrar sesión"
            >
              <LogOut size={17} />
              {!collapsed && <span>Salir</span>}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
