import { Link } from "react-router-dom";

const SUGGESTION_FORM_URL = "https://forms.gle/w9jk5jhJGbsZ777P6";

export function Footer() {
  return (
    <footer className="border-t bg-white mt-auto">
      <div className="max-w-5xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-gray-500">
        <p>
          &copy; {new Date().getFullYear()} Rotisserie — Keeping your meals on rotation
        </p>
        <div className="flex items-center gap-4">
          <Link to="/privacy" className="text-terracotta-600 hover:underline">
            Privacy Policy
          </Link>
          <a
            href={SUGGESTION_FORM_URL}
            target="_blank"
            rel="noreferrer"
            className="text-terracotta-600 hover:underline"
          >
            Got a suggestion?
          </a>
        </div>
      </div>
    </footer>
  );
}
