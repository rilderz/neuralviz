export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// OAuth is optional. When VITE_OAUTH_PORTAL_URL / VITE_APP_ID are not set,
// getLoginUrl() returns "/" so any code that still calls it won't throw or
// redirect users to a broken URL.
export const getLoginUrl = (): string => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;

  if (!oauthPortalUrl || !appId) {
    // OAuth not configured — fall back to the app root.
    return "/";
  }

  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = btoa(redirectUri);

  const url = new URL(`${oauthPortalUrl}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  return url.toString();
};