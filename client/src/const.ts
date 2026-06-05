export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Generate login URL at runtime so redirect URI reflects the current origin.
export const getLoginUrl = () => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;

  console.log("VITE_OAUTH_PORTAL_URL:", oauthPortalUrl);
  console.log("VITE_APP_ID:", appId);

  if (!oauthPortalUrl) {
    throw new Error(
      "VITE_OAUTH_PORTAL_URL is not defined. Check your .env file."
    );
  }

  if (!appId) {
    throw new Error(
      "VITE_APP_ID is not defined. Check your .env file."
    );
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