import { GoogleLogin } from "@react-oauth/google";
import { useGoogleLogin } from "../api/auth.js";

export function LoginScreen() {
  const login = useGoogleLogin();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white border rounded-lg shadow-sm p-8 flex flex-col items-center gap-4">
        <span className="text-2xl font-semibold text-emerald-700">🍽️ Meal Planner</span>
        <p className="text-sm text-gray-600">Sign in to see your recipes and meal plan.</p>
        <GoogleLogin
          onSuccess={(credentialResponse) => {
            if (credentialResponse.credential) {
              login.mutate(credentialResponse.credential);
            }
          }}
          onError={() => login.reset()}
        />
        {login.isError && (
          <p className="text-sm text-red-600">Sign-in failed. Please try again.</p>
        )}
      </div>
    </div>
  );
}
