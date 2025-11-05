import { useSession } from "../context/session";

export const useAuth = () => {
  const { user, loading, login, logout, refresh } = useSession();
  return {
    user,
    loading,
    login,
    logout,
    refresh,
    isAuthenticated: Boolean(user)
  };
};
