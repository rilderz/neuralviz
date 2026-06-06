// Authentication is disabled. All pages are accessible without login.
// This hook returns a default "authenticated" state so pages that
// call useAuth() continue to work without any OAuth configuration.

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(_options?: UseAuthOptions) {
  const logout = async () => {
    // No-op: authentication is disabled
  };

  return {
    user: null,
    loading: false,
    error: null,
    isAuthenticated: true,
    refresh: () => Promise.resolve(),
    logout,
  };
}
