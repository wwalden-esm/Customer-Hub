import { EsmLogo } from "./EsmLogo";

interface EsmFooterProps {
  variant?: "staff" | "customer";
}

export function EsmFooter({ variant = "staff" }: EsmFooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto no-print">
      <div className="bg-esm-red text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-8">
            <div className="flex flex-col gap-3">
              <EsmLogo size={80} variant="white" />
              <div className="flex items-center gap-4 mt-2">
                <a
                  href="https://www.linkedin.com/company/esm-solutions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/80 hover:text-white transition-colors"
                  aria-label="ESM Solutions on LinkedIn"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                </a>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-8 sm:gap-16 text-sm">
              <div className="flex flex-col gap-2">
                <a href="https://esmsolutions.com/privacy-policy/" target="_blank" rel="noopener noreferrer" className="text-white/80 hover:text-white transition-colors">
                  Privacy Policy
                </a>
                <a href="https://esmsolutions.com/terms-and-conditions/" target="_blank" rel="noopener noreferrer" className="text-white/80 hover:text-white transition-colors">
                  Terms and Conditions
                </a>
              </div>

              {variant === "customer" && (
                <div className="flex flex-col gap-1 text-white/70 text-xs">
                  <span className="text-white font-medium text-sm">Need help?</span>
                  <span>Contact your Solutions Consultant</span>
                </div>
              )}

              {variant === "staff" && (
                <div className="flex flex-col gap-1 text-white/70 text-xs">
                  <span className="text-white font-medium text-sm">Contact</span>
                  <span>877-969-7246</span>
                  <span>esmsolutions.com</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="bg-esm-black text-white/60 text-xs py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          &copy; {currentYear} ESM Solutions Corporation. All Rights Reserved.
        </div>
      </div>
    </footer>
  );
}
