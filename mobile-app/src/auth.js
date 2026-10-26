import { createContext, useContext } from 'react';

export const AuthContext = createContext({
  signIn:  async () => {},
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);