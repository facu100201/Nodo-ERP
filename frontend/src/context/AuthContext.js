import React, { createContext, useState, useContext, useEffect } from 'react';
import { authService } from '../services/apiService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar si hay un token guardado al cargar la app. El token puede
    // residir en localStorage (recordar sesión) o en sessionStorage.
    const savedToken = localStorage.getItem('token') || sessionStorage.getItem('token');
    const savedUser = localStorage.getItem('user') || sessionStorage.getItem('user');
    
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  // ``remember`` indica si debe persistir la sesión entre cierres del
  // navegador. Si es falso, almacenamos en sessionStorage (se borra al
  // cerrar pestaña) en lugar de localStorage.
  const login = async (username, password, remember = true) => {
    try {
      const response = await authService.login(username, password);
      // eslint-disable-next-line no-unused-vars
      const { access_token, token_type } = response;
      
      const storage = remember ? localStorage : sessionStorage;
      // Guardar token y usuario en el almacenamiento elegido.
      storage.setItem('token', access_token);
      setToken(access_token);

      const userData = await authService.getCurrentUser();
      storage.setItem('user', JSON.stringify(userData));
      setUser(userData);

      return { success: true };
    } catch (error) {
      console.error('Error en login:', error);
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Error al iniciar sesión' 
      };
    }
  };

  const logout = () => {
    // retirar de ambos almacenamientos para simplificar
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    isAuthenticated: !!token,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};

export default AuthContext;
