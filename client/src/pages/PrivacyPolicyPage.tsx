import { Link } from "react-router-dom";
import { Logo } from "../components/Logo.js";

const CONTACT_EMAIL = "coldwellaj@gmail.com";
const LAST_UPDATED = "September 21, 2026";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      <div className="text-sm text-gray-600 flex flex-col gap-2">{children}</div>
    </section>
  );
}

// Public route — reachable without signing in (see App.tsx) so it can be linked from the
// Google OAuth consent screen configuration, which requires a live, unauthenticated URL.
export function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-10 flex flex-col gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <Link to="/">
            <Logo size={56} />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Privacy Policy</h1>
          <p className="text-xs text-gray-400">Last updated {LAST_UPDATED}</p>
        </div>

        <div className="bg-white border rounded-lg shadow-sm p-6 flex flex-col gap-6">
          <p className="text-sm text-gray-600">
            Rotisserie ("What's for Dinner?") is a recipe, meal-planning, and shopping-list app.
            This page explains what information we collect, how it's used, and who it's shared
            with.
          </p>

          <Section title="Information we collect">
            <p>When you create an account, we collect:</p>
            <ul className="list-disc list-inside flex flex-col gap-1">
              <li>Your email address and, if you sign up with a password, a securely hashed version of it (we never store your password in plain text).</li>
              <li>If you sign in with Google instead, your name, email address, and profile picture as provided by Google.</li>
              <li>Any name, username, or profile picture you add or change yourself.</li>
            </ul>
            <p>As you use the app, we store the content you create: recipes, ingredients, meal plans, shopping lists, and your friend and family connections.</p>
          </Section>

          <Section title="How we use your information">
            <p>
              We use this information only to run the app: to show your recipes and meal plans
              back to you, generate shopping lists, and — where you've chosen to enable it — let
              friends or family members see your meal plan, recently-made recipes, or recipe
              list. We don't use your data for advertising, and we don't sell it to anyone.
            </p>
          </Section>

          <Section title="What you share with others">
            <p>
              By default your recipes, meal plans, and shopping lists are private to you (or to
              your family, if you've joined one). Two things make information visible beyond
              that:
            </p>
            <ul className="list-disc list-inside flex flex-col gap-1">
              <li>Marking a recipe "shareable" makes it visible to any signed-in user on the Discover page.</li>
              <li>Adding friends and turning on a visibility setting (meal plan, recently-made recipes, or recipe list) shares that specific information with your friends, or with all signed-in users if you choose that option.</li>
            </ul>
            <p>You control both of these, and can turn them off at any time.</p>
          </Section>

          <Section title="Third-party services">
            <p>We use a small number of third-party services to run the app:</p>
            <ul className="list-disc list-inside flex flex-col gap-1">
              <li><strong>Google Sign-In</strong>, if you choose to log in that way, to verify your identity.</li>
              <li><strong>Resend</strong>, to send account-related emails (like friend requests or family invites) — only when those features are used.</li>
              <li>Our database and hosting providers, who store app data on our behalf and don't use it for their own purposes.</li>
            </ul>
          </Section>

          <Section title="Cookies and sessions">
            <p>
              We use a single session cookie to keep you signed in. It's used only for
              authentication — we don't use tracking or advertising cookies.
            </p>
          </Section>

          <Section title="Data retention and deletion">
            <p>
              We keep your data for as long as your account is active. To request that your
              account and associated data be deleted, email us at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-terracotta-600 hover:underline">
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </Section>

          <Section title="Children's privacy">
            <p>Rotisserie is not directed at children under 13, and we don't knowingly collect information from them.</p>
          </Section>

          <Section title="Changes to this policy">
            <p>If this policy changes, we'll update the date at the top of this page.</p>
          </Section>

          <Section title="Contact">
            <p>
              Questions about this policy or your data? Email{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-terracotta-600 hover:underline">
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </Section>
        </div>

        <Link to="/" className="text-sm text-terracotta-600 hover:underline text-center">
          &larr; Back to Rotisserie
        </Link>
      </div>
    </div>
  );
}
