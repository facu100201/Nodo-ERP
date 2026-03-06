import React, { useState, useEffect } from 'react';
import { BarChart3, PieChart, Package, ExternalLink, RefreshCw, AlertCircle } from 'lucide-react';
import './Analitica.css';

const METABASE_URL = process.env.REACT_APP_METABASE_URL || 'http://localhost:3001';

const TABS = [
  {
    id: 'ventas',
    label: 'Ventas',
    icon: BarChart3,
    description: 'Tendencias, metodos de pago, top productos',
    envKey: 'REACT_APP_METABASE_DASHBOARD_VENTAS',
  },
  {
    id: 'inventario',
    label: 'Inventario',
    icon: Package,
    description: 'Stock actual, alertas y movimientos',
    envKey: 'REACT_APP_METABASE_DASHBOARD_INVENTARIO',
  },
  {
    id: 'general',
    label: 'General',
    icon: PieChart,
    description: 'Facturacion y metricas del negocio',
    envKey: 'REACT_APP_METABASE_DASHBOARD_GENERAL',
  },
];

function Analitica() {
  const [activeTab, setActiveTab] = useState('ventas');
  const [dashboardUUIDs, setDashboardUUIDs] = useState({});
  const [loading, setLoading] = useState(true);
  const [metabaseReady, setMetabaseReady] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  useEffect(() => {
    // Cargar UUIDs desde variables de entorno
    const uuids = {};
    TABS.forEach((tab) => {
      const uuid = process.env[tab.envKey];
      if (uuid) {
        uuids[tab.id] = uuid;
      }
    });
    setDashboardUUIDs(uuids);

    // Verificar si Metabase esta disponible
    checkMetabaseHealth();
  }, []);

  const checkMetabaseHealth = async () => {
    setLoading(true);
    try {
      await fetch(`${METABASE_URL}/api/health`, {
        mode: 'no-cors',
      });
      // Con no-cors, si no falla es que el servidor responde
      setMetabaseReady(true);
    } catch {
      setMetabaseReady(false);
    } finally {
      setLoading(false);
    }
  };

  const getDashboardUrl = (tabId) => {
    const uuid = dashboardUUIDs[tabId];
    if (uuid) {
      return `${METABASE_URL}/public/dashboard/${uuid}#bordered=false&titled=false`;
    }
    // Fallback: usar Metabase directamente
    return `${METABASE_URL}/collection/root`;
  };

  const handleRefresh = () => {
    setIframeKey((prev) => prev + 1);
  };

  const activeTabData = TABS.find((t) => t.id === activeTab);
  const hasDashboardUUID = Boolean(dashboardUUIDs[activeTab]);

  return (
    <div className="analitica-container">
      {/* Header */}
      <div className="analitica-header">
        <div className="analitica-header-info">
          <h2 className="analitica-title">
            <BarChart3 size={24} />
            Analitica
          </h2>
          <p className="analitica-subtitle">
            Dashboards interactivos con Metabase
          </p>
        </div>
        <div className="analitica-header-actions">
          <button
            className="analitica-btn analitica-btn--secondary"
            onClick={handleRefresh}
            title="Recargar dashboard"
          >
            <RefreshCw size={16} />
            Recargar
          </button>
          <a
            href={METABASE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="analitica-btn analitica-btn--primary"
          >
            <ExternalLink size={16} />
            Abrir Metabase
          </a>
        </div>
      </div>

      {/* Tabs */}
      <div className="analitica-tabs">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              className={`analitica-tab ${isActive ? 'analitica-tab--active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={18} />
              <span className="analitica-tab-label">{tab.label}</span>
              <span className="analitica-tab-desc">{tab.description}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="analitica-content">
        {loading ? (
          <div className="analitica-status">
            <div className="analitica-spinner" />
            <p>Verificando conexion con Metabase...</p>
          </div>
        ) : !metabaseReady ? (
          <div className="analitica-status analitica-status--error">
            <AlertCircle size={48} />
            <h3>Metabase no disponible</h3>
            <p>
              No se pudo conectar a Metabase en <code>{METABASE_URL}</code>.
              Verifica que el servicio este corriendo:
            </p>
            <pre>docker compose -f docker/docker-compose.yml up -d metabase</pre>
            <button
              className="analitica-btn analitica-btn--primary"
              onClick={checkMetabaseHealth}
              style={{ marginTop: '16px' }}
            >
              <RefreshCw size={16} />
              Reintentar
            </button>
          </div>
        ) : (
          <div className="analitica-iframe-wrapper">
            {!hasDashboardUUID && (
              <div className="analitica-notice">
                <AlertCircle size={16} />
                <span>
                  Dashboard publico no configurado. Mostrando Metabase completo.
                  Ejecuta <code>bash scripts/setup-metabase.sh</code> para
                  configurar dashboards automaticamente.
                </span>
              </div>
            )}
            <iframe
              key={`${activeTab}-${iframeKey}`}
              src={getDashboardUrl(activeTab)}
              className="analitica-iframe"
              title={`Dashboard ${activeTabData?.label}`}
              allowFullScreen
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default Analitica;
