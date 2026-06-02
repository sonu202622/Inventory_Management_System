import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser, registerUser, getMe } from "../api/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem("inventory_token"));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    getMe()
      .then((res) => setUser(res.data))
      .catch(() => {
        localStorage.removeItem("inventory_token");
        setToken(null);
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  const login = useCallback(async (username, password) => {
    const res = await loginUser(username, password);
    const { access_token, user: userData } = res.data;
    localStorage.setItem("inventory_token", access_token);
    setToken(access_token);
    setUser(userData);
    return userData;
  }, []);

  const register = useCallback(async (data) => {
    const res = await registerUser(data);
    const { access_token, user: userData } = res.data;
    localStorage.setItem("inventory_token", access_token);
    setToken(access_token);
    setUser(userData);
    return userData;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("inventory_token");
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, token, isAuthenticated: !!user, isLoading, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
