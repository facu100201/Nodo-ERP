import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Login.css';

/* ── NODO circular logo ─────────────────────────────── */
const NodoLogo = () => {
  const vLines = Array.from({ length: 26 }, (_, i) => {
    const x = 10 + i * 7;
    return (
      <line key={`v${i}`} x1={x} y1="0" x2={x} y2="200"
        stroke="#1a1a1a" strokeWidth="0.9" />
    );
  });

  const dLines = Array.from({ length: 24 }, (_, i) => {
    const o = -150 + i * 17;
    return (
      <line key={`d${i}`} x1={o} y1="0" x2={o + 200} y2="200"
        stroke="#1a1a1a" strokeWidth="0.9" />
    );
  });

  return (
    <svg viewBox="0 0 200 200" width="148" height="148">
      <defs>
        <clipPath id="nodo-clip">
          <circle cx="100" cy="100" r="88" />
        </clipPath>
      </defs>
      <g clipPath="url(#nodo-clip)">
        {vLines}
        {dLines}
      </g>
      <circle cx="100" cy="100" r="88"
        fill="none" stroke="#1a1a1a" strokeWidth="1.8" />
    </svg>
  );
};

/* ── Login page ─────────────────────────────────────── */
function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard');
  }, [isAuthenticated, navigate]);

  /* sin scroll en la página de login */
  useEffect(() => {
    document.documentElement.classList.add('login-page-active');
    document.body.classList.add('login-page-active');
    return () => {
      document.documentElement.classList.remove('login-page-active');
      document.body.classList.remove('login-page-active');
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await login(username, password);
      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.error || 'Error al iniciar sesión');
      }
    } catch {
      setError('Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-panels">

        {/* ── Panel izquierdo: formulario ── */}
        <div className="login-form-panel">
          <h1 className="login-title">Bienvenido</h1>

          {error && (
            <div className="login-error" role="alert">{error}</div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="login-field">
              <label htmlFor="l-email" className="login-label">
                Usuario
              </label>
              <input
                id="l-email"
                type="text"
                className="login-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={loading}
                autoComplete="username"
              />
            </div>

            <div className="login-field">
              <label htmlFor="l-password" className="login-label">
                Contraseña
              </label>
              <input
                id="l-password"
                type="password"
                className="login-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              className="login-submit-btn"
              disabled={loading}
            >
              {loading ? (
                <span className="login-spinner-wrap">
                  <span className="login-spinner" aria-hidden="true" />
                  Iniciando sesión...
                </span>
              ) : 'Iniciar sesión'}
            </button>
          </form>
        </div>

        {/* ── Panel derecho: marca ── */}
        <div className="login-brand-panel">
          <div className="login-brand-logo-wrap">
            <NodoLogo />
          </div>
          <p className="login-brand-name">N O D O</p>
          <p className="login-brand-tagline">textile upcycling</p>
        </div>

      </div>
    </div>
  );
}

export default Login;
