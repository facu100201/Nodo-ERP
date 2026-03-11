import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Login.css';
import logoNodo from './imglogin/logo.png';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(false);

  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard');
  }, [isAuthenticated, navigate]);

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
      const result = await login(username, password, remember);
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
            <div className="login-error" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate aria-busy={loading}>
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
                autoCapitalize="none"
                spellCheck={false}
                inputMode="email"
                enterKeyHint="next"
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
                enterKeyHint="go"
              />
            </div>

            <div className="login-field login-remember">
              <label className="login-remember-label">
                <input
                  type="checkbox"
                  className="login-checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  disabled={loading}
                />
                Recuérdame
              </label>
            </div>

            <button
              type="submit"
              className="login-submit-btn"
              disabled={loading}
              aria-busy={loading}
            >
              {loading ? (
                <span className="login-spinner-wrap">
                  <span className="login-spinner" aria-hidden="true" />
                  Iniciando sesión...
                </span>
              ) : (
                'Iniciar sesión'
              )}
            </button>
          </form>
        </div>

        {/* ── Panel derecho: marca ── */}
        <div className="login-brand-panel">
          <div className="login-brand-logo-wrap">
            <img
              src={logoNodo}
              alt="Nodo textile upcycling"
              className="login-brand-logo-img"
            />
          </div>
          <p className="login-brand-name">N O D O</p>
          <p className="login-brand-tagline">own your vibe</p>
        </div>
      </div>
    </div>
  );
}

export default Login;