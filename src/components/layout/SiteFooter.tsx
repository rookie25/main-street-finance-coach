import { Link } from "react-router-dom";

export default function SiteFooter() {
  return (
    <footer className="bg-primary text-primary-foreground mt-24">
      <div className="container-prose py-16 grid gap-12 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="font-display text-2xl font-semibold mb-2">Desired Labs</div>
          <p className="text-primary-foreground/70 max-w-sm">
            The AI CFO for Main Street. Daily clarity, automated bookkeeping, and zero tax surprises.
          </p>
        </div>
        <div>
          <div className="text-sm font-semibold mb-4 uppercase tracking-wider text-accent">Platform</div>
          <ul className="space-y-2 text-primary-foreground/80 text-sm">
            <li><Link to="/how-it-works" className="hover:text-accent transition-colors">How It Works</Link></li>
            <li><Link to="/services" className="hover:text-accent transition-colors">Services</Link></li>
            <li><Link to="/cpa-partners" className="hover:text-accent transition-colors">For CPAs</Link></li>
          </ul>
        </div>
        <div>
          <div className="text-sm font-semibold mb-4 uppercase tracking-wider text-accent">Company</div>
          <ul className="space-y-2 text-primary-foreground/80 text-sm">
            <li><Link to="/about" className="hover:text-accent transition-colors">About</Link></li>
            <li><Link to="/contact" className="hover:text-accent transition-colors">Get Started</Link></li>
            <li><Link to="/privacy" className="hover:text-accent transition-colors">Privacy Policy</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-primary-foreground/10">
        <div className="container-prose py-6 flex flex-col md:flex-row gap-3 justify-between text-xs text-primary-foreground/60">
          <p>© 2026 Desired Labs. AI-powered financial operations for Main Street businesses.</p>
          <p>Not a CPA firm. We do not prepare or sign tax returns.</p>
        </div>
      </div>
    </footer>
  );
}
