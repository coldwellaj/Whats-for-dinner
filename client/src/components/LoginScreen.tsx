import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { useEmailLogin, useEmailSignup, useGoogleLogin } from "../api/auth.js";
import { isNativePlatform, nativeGoogleSignIn } from "../lib/nativeGoogleAuth.js";
import { Logo } from "./Logo.js";

export function LoginScreen() {
  const googleLogin = useGoogleLogin();
  const emailLogin = useEmailLogin();
  const emailSignup = useEmailSignup();

  // Family-invite emails link new users here as `?signup=<email>` to land straight in
  // signup mode with their email already filled in.
  const [searchParams] = useSearchParams();
  const prefillEmail = searchParams.get("signup") ?? "";

  const [mode, setMode] = useState<"login" | "signup">(prefillEmail ? "signup" : "login");
  const [email, setEmail] = useState(prefillEmail);
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");

  const emailMutation = mode === "login" ? emailLogin : emailSignup;

  const [nativeGoogleError, setNativeGoogleError] = useState(false);

  async function handleNativeGoogleSignIn() {
    setNativeGoogleError(false);
    try {
      const idToken = await nativeGoogleSignIn();
      googleLogin.mutate(idToken);
    } catch (err) {
      // The user dismissing the native account picker isn't a real error worth surfacing.
      if ((err as { code?: string } | null)?.code !== "USER_CANCELLED") {
        setNativeGoogleError(true);
      }
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "login") {
      emailLogin.mutate({ email, password });
    } else {
      emailSignup.mutate({ email, password, name: name || undefined, username: username || undefined });
    }
  }

  function toggleMode() {
    setMode((m) => (m === "login" ? "signup" : "login"));
    emailLogin.reset();
    emailSignup.reset();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white border rounded-lg shadow-sm p-8 flex flex-col items-center gap-4 w-full max-w-sm">
        <Logo size={80} />
        <p className="text-sm text-gray-600 text-center">
          {mode === "login" ? "Sign in to see your recipes and meal plan." : "Create an account to get started."}
        </p>

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
          {mode === "signup" && (
            <input
              type="text"
              placeholder="Name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border rounded-md px-3 py-2 text-base sm:text-sm w-full"
              autoComplete="name"
            />
          )}
          {mode === "signup" && (
            <input
              type="text"
              placeholder="Username (optional)"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="border rounded-md px-3 py-2 text-base sm:text-sm w-full"
              autoComplete="username"
              minLength={3}
              maxLength={20}
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border rounded-md px-3 py-2 text-base sm:text-sm w-full"
            autoComplete="email"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border rounded-md px-3 py-2 text-base sm:text-sm w-full"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            minLength={mode === "signup" ? 8 : undefined}
            required
          />
          <button
            type="submit"
            disabled={emailMutation.isPending}
            className="bg-terracotta-600 hover:bg-terracotta-700 disabled:opacity-60 text-white text-sm font-medium rounded-md px-3 py-2 w-full"
          >
            {emailMutation.isPending ? "Please wait…" : mode === "login" ? "Sign in" : "Sign up"}
          </button>
        </form>

        {emailMutation.isError && (
          <p className="text-sm text-red-600 text-center">{emailMutation.error.message}</p>
        )}

        <button
          type="button"
          onClick={toggleMode}
          className="text-sm text-terracotta-700 hover:underline"
        >
          {mode === "login" ? "Need an account? Sign up" : "Already have an account? Sign in"}
        </button>

        <div className="flex items-center gap-3 w-full">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400">or</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {isNativePlatform ? (
          <button
            type="button"
            onClick={handleNativeGoogleSignIn}
            disabled={googleLogin.isPending}
            className="border rounded-md px-3 py-2 w-full text-sm font-medium text-gray-700 disabled:opacity-60"
          >
            {googleLogin.isPending ? "Please wait…" : "Sign in with Google"}
          </button>
        ) : (
          <GoogleLogin
            onSuccess={(credentialResponse) => {
              if (credentialResponse.credential) {
                googleLogin.mutate(credentialResponse.credential);
              }
            }}
            onError={() => googleLogin.reset()}
          />
        )}
        {(googleLogin.isError || nativeGoogleError) && (
          <p className="text-sm text-red-600">Sign-in failed. Please try again.</p>
        )}
      </div>
    </div>
  );
}
