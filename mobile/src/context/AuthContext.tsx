import { createContext, useContext } from "react";

interface AuthContextValue {
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue>({ logout: () => {} });
export function useAuth() { return useContext(AuthContext); }
