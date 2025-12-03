import { useSession } from "../context/session";

export const useAuth = () => {
  const { user, loading, login, loginWithOAuth, logout, refresh } = useSession();
  return {
    user,
    loading,
    login,
    loginWithOAuth,
    logout,
    refresh,
    isAuthenticated: Boolean(user)
  };
};
