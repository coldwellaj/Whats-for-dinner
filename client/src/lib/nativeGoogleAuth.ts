import { Capacitor } from "@capacitor/core";
import { SocialLogin } from "@capgo/capacitor-social-login";

export const isNativePlatform = Capacitor.isNativePlatform();

let initialized: Promise<void> | null = null;

// Google blocks its web OAuth flow (the <GoogleLogin> button from @react-oauth/google) inside
// an embedded WebView with a "disallowed_useragent" error, so the native app shell needs this
// plugin's native Credential Manager / Sign in with Google SDKs instead. webClientId is the
// same "Web application" OAuth client the web build already uses (VITE_GOOGLE_CLIENT_ID) — the
// plugin requests an ID token audienced to it so the existing POST /api/auth/google endpoint
// can verify native and web sign-ins identically, with no server-side changes.
function initNativeGoogleAuth(): Promise<void> {
  if (!initialized) {
    const webClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const iOSClientId = import.meta.env.VITE_GOOGLE_IOS_CLIENT_ID;
    initialized = SocialLogin.initialize({
      google: {
        webClientId,
        iOSClientId,
        iOSServerClientId: webClientId,
        mode: "online",
      },
    });
  }
  return initialized;
}

// Runs the native Google Sign-In UI and returns the Google ID token, ready to hand to the same
// useGoogleLogin() mutation (POST /api/auth/google) the web GoogleLogin button already uses.
export async function nativeGoogleSignIn(): Promise<string> {
  await initNativeGoogleAuth();
  // Don't pass custom `scopes` here: the plugin already requests email/profile/openid by
  // default, which is all this app needs. Passing scopes explicitly switches Android onto an
  // authorization-code flow that requires MainActivity to implement a plugin-specific
  // interface to receive its activity result — unnecessary complexity for scopes we already
  // get for free.
  const { result } = await SocialLogin.login({
    provider: "google",
    options: {},
  });
  if (result.responseType !== "online" || !result.idToken) {
    throw new Error("Google sign-in did not return a token");
  }
  return result.idToken;
}
