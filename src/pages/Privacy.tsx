import Reveal from "@/components/Reveal";

export default function Privacy() {
  return (
    <section className="py-24 md:py-32 -mt-20 pt-44 bg-background">
      <div className="container-prose max-w-3xl">
        <Reveal>
          <div className="text-xs uppercase tracking-[0.2em] text-accent mb-5">Legal</div>
          <h1 className="font-display text-4xl md:text-5xl font-semibold text-primary mb-3">
            Privacy Policy
          </h1>
          <p className="text-sm text-muted-foreground mb-12">Effective June 1, 2026</p>

          <div className="prose prose-neutral max-w-none space-y-10 text-foreground leading-relaxed">

            <div>
              <h2 className="font-display text-2xl font-semibold text-primary mb-3">1. Information We Collect</h2>
              <p className="text-muted-foreground">
                We collect information you provide directly — such as your name, email address, and business details when you contact us or create an account. We also collect financial data you authorize us to access through third-party integrations (Square, Plaid, Gmail), which is used solely to provide our bookkeeping and reporting services. We may collect usage data such as pages visited and features used to improve the platform.
              </p>
            </div>

            <div>
              <h2 className="font-display text-2xl font-semibold text-primary mb-3">2. How We Use Your Information</h2>
              <p className="text-muted-foreground">
                We use your information to deliver and improve our services, generate financial reports and briefings, communicate with you about your account, and comply with legal obligations. We do not sell your personal information to third parties. Financial data is processed exclusively for the purpose of providing your bookkeeping, tax, and reporting services.
              </p>
            </div>

            <div>
              <h2 className="font-display text-2xl font-semibold text-primary mb-3">3. Data Security</h2>
              <p className="text-muted-foreground">
                We store your data on Supabase (PostgreSQL), a SOC 2 Type II certified platform. All data is encrypted in transit (TLS) and at rest. Access to your financial data is restricted to your account and authorized Desired Labs staff on a need-to-know basis. We use row-level security policies to ensure no client can access another client's data.
              </p>
            </div>

            <div>
              <h2 className="font-display text-2xl font-semibold text-primary mb-3">4. Third Parties</h2>
              <p className="text-muted-foreground">
                We integrate with Square, Plaid, and Google (Gmail) to pull your financial data — only with your explicit authorization. We use Anthropic's Claude API to generate financial summaries; data sent to Claude is used only to generate your reports and is not used to train models. We use Railway for infrastructure hosting. None of these providers are permitted to use your data for their own commercial purposes beyond service delivery.
              </p>
            </div>

            <div>
              <h2 className="font-display text-2xl font-semibold text-primary mb-3">5. Your Rights</h2>
              <p className="text-muted-foreground">
                You may request access to, correction of, or deletion of your personal data at any time. To exercise these rights, contact us at the address below. Upon termination of service, your data is retained for 90 days for audit purposes and then permanently deleted unless legally required otherwise.
              </p>
            </div>

            <div>
              <h2 className="font-display text-2xl font-semibold text-primary mb-3">6. Contact Us</h2>
              <p className="text-muted-foreground">
                Desired Labs LLC<br />
                Stockton, CA<br />
                <a href="mailto:hello@desiredlabs.ai" className="text-accent hover:underline underline-offset-2">
                  hello@desiredlabs.ai
                </a>
              </p>
            </div>

          </div>
        </Reveal>
      </div>
    </section>
  );
}
