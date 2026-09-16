import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { api, tokenStore, adoptDemoSession } from '@/api/client';

// Session state for the app.
//
// Nothing blocks the first render: the directory is public, so we resolve the
// session in the background and let individual pages send visitors to /login
// when they actually need one.
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  const checkUserAuth = useCallback(async () => {
    // A demo instance hands out a guest session so the whole app is browsable
    // without signing in. Returns false everywhere else, leaving the flow below
    // untouched.
    if (!tokenStore.get()) {
      try { await adoptDemoSession(); } catch { /* fall through to signed-out */ }
    }
    if (!tokenStore.get()) {
      setUser(null);
      setIsAuthenticated(false);
      setIsLoadingAuth(false);
      setAuthChecked(true);
      return null;
    }
    try {
      setIsLoadingAuth(true);
      const currentUser = await api.auth.me();
      setUser(currentUser);
      setIsAuthenticated(true);
      setAuthError(null);
      return currentUser;
    } catch (error) {
      // An expired or tampered token should log the visitor out quietly rather
      // than trapping them on an error screen. On a demo instance, fall back to
      // the guest session — otherwise a visitor still holding a token from an
      // earlier build is stuck at the login wall, because adoptDemoSession
      // refuses to replace an existing token and nothing else clears it.
      if (error.status === 401 || error.status === 403) {
        tokenStore.set(null);
        try {
          // `false` can also mean "somebody else already adopted one" — the
          // helper refuses when a token exists. Without the second check, two
          // concurrent recoveries left the winner signed in as a guest while
          // this one rendered the whole app as signed-out until a reload.
          const adopted = await adoptDemoSession();
          if (adopted || tokenStore.get()) {
            const guest = await api.auth.me();
            setUser(guest);
            setIsAuthenticated(true);
            setAuthError(null);
            return guest;
          }
        } catch { /* fall through to signed-out */ }
      }
      setUser(null);
      setIsAuthenticated(false);
      return null;
    } finally {
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  }, []);

  useEffect(() => { checkUserAuth(); }, [checkUserAuth]);

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    if (shouldRedirect) api.auth.logout('/');
    else tokenStore.set(null);
  };

  const navigateToLogin = () => api.auth.redirectToLogin(window.location.href);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        // The shared guest session: signed in for reading, not a member.
        isGuest: !!user?.guest,
        isLoadingAuth,
        // Retained so existing consumers keep working; nothing blocks on it now.
        isLoadingPublicSettings: false,
        authError,
        appPublicSettings: null,
        authChecked,
        logout,
        navigateToLogin,
        checkUserAuth,
        checkAppState: checkUserAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
