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
          <p className="text-sm text-muted-foreground mb-12">Effective June 16, 2026</p>

          <div className="prose prose-neutral max-w-none space-y-10 text-foreground leading-relaxed">

            <div>
              <p className="text-muted-foreground">
                This policy applies to the Desired Labs bookkeeping and financial-assistant service, available on the web and as a mobile application (the "Service"), operated by Desired Labs LLC. The Service is for business use by adults (18+) and is not directed to children.
              </p>
            </div>

            <div>
              <h2 className="font-display text-2xl font-semibold text-primary mb-3">1. Information We Collect</h2>
              <p className="text-muted-foreground">
                <strong>Account &amp; contact information</strong> you provide — name, email, phone, business name and address, and login credentials (your password is handled by our authentication provider; we do not store it).<br /><br />
                <strong>Financial &amp; business data</strong> you authorize us to access or that you upload, used solely to provide bookkeeping and reporting: bank transactions and balances via <strong>Plaid</strong> (you connect your bank through Plaid; we do not receive your bank login); sales data from services you connect such as <strong>Square</strong> and <strong>DoorDash</strong>; card/credit statements (e.g. American Express exports); accounting data you import (e.g. QuickBooks); documents you upload (receipts, statements, invoices); and records you create (invoices, categorizations, messages to your advisor).<br /><br />
                <strong>Payment information</strong> for subscriptions, processed by <strong>Stripe</strong> (we do not store full card numbers).<br /><br />
                <strong>Usage &amp; device information</strong> — app/feature usage, log and diagnostic data, and device/app version — to operate, secure, and improve the Service.
              </p>
            </div>

            <div>
              <h2 className="font-display text-2xl font-semibold text-primary mb-3">2. How We Use Your Information</h2>
              <p className="text-muted-foreground">
                We use your information to deliver the Service (build your books, reports, balance sheet, tax estimates, and dashboards), power the AI financial assistant, communicate with you about your account, process subscription billing, secure and improve the Service, and comply with legal obligations. <strong>We do not sell your personal or financial information.</strong>
              </p>
            </div>

            <div>
              <h2 className="font-display text-2xl font-semibold text-primary mb-3">3. AI Processing</h2>
              <p className="text-muted-foreground">
                Our AI financial assistant uses Anthropic's Claude. When you use it, the financial context needed to answer your question is sent to Anthropic for processing. Data submitted through our business API is not used to train Anthropic's models, and we do not use your data to train third-party AI models.
              </p>
            </div>

            <div>
              <h2 className="font-display text-2xl font-semibold text-primary mb-3">4. How We Share Information</h2>
              <p className="text-muted-foreground">
                We do not sell your data. We share it only with service providers ("subprocessors") that help us run the Service under confidentiality and security obligations: <strong>Supabase</strong> (database, storage, authentication), <strong>Railway</strong> and <strong>Vercel</strong> (hosting), <strong>Plaid</strong> (bank connection), <strong>Square</strong> / <strong>DoorDash</strong> (sales import), <strong>Stripe</strong> (billing), <strong>Anthropic</strong> (AI assistant), and <strong>Google</strong> (sign-in and app distribution). Your assigned accountant/bookkeeper can access the books for the client(s) they serve. We may disclose information where required by law or in connection with a business transfer, with notice where required.
              </p>
            </div>

            <div>
              <h2 className="font-display text-2xl font-semibold text-primary mb-3">5. Data Security</h2>
              <p className="text-muted-foreground">
                We store data on Supabase (PostgreSQL), a SOC 2 Type II certified platform. Data is encrypted in transit (TLS); sensitive credentials (e.g. connected-account tokens) are encrypted at rest. We enforce database row-level security and per-tenant isolation so no client can access another client's data, use short-lived signed links for document access, and limit staff access on a need-to-know basis.
              </p>
            </div>

            <div>
              <h2 className="font-display text-2xl font-semibold text-primary mb-3">6. Data Retention &amp; Deletion</h2>
              <p className="text-muted-foreground">
                We retain your information while your account is active and as needed to provide the Service and meet legal, tax, and accounting obligations. You can request deletion of your account and data at any time by contacting us at the address below; upon account closure we delete or de-identify your personal and financial data within 90 days, except where longer retention is legally required. You can disconnect a connected account (e.g. revoke a bank link) within the app at any time.
              </p>
            </div>

            <div>
              <h2 className="font-display text-2xl font-semibold text-primary mb-3">7. Your Rights</h2>
              <p className="text-muted-foreground">
                Depending on where you live (including California/CCPA and the EEA/UK/GDPR), you may have the right to access, correct, delete, or export your personal information, and to opt out of non-essential communications. We do not sell personal information. To exercise any right, contact us below; we respond within the timeframe required by applicable law. You can also manage Plaid's handling of your data via Plaid's End User Privacy Policy (plaid.com/legal).
              </p>
            </div>

            <div>
              <h2 className="font-display text-2xl font-semibold text-primary mb-3">8. International Users &amp; Children</h2>
              <p className="text-muted-foreground">
                We operate in the United States; if you use the Service from elsewhere, your information is processed in the U.S. and other countries where our providers operate. The Service is not intended for individuals under 18, and we do not knowingly collect data from children.
              </p>
            </div>

            <div>
              <h2 className="font-display text-2xl font-semibold text-primary mb-3">9. Changes to This Policy</h2>
              <p className="text-muted-foreground">
                We may update this policy; we will post the new effective date and, for material changes, notify you. Continued use after changes means you accept the updated policy.
              </p>
            </div>

            <div>
              <h2 className="font-display text-2xl font-semibold text-primary mb-3">10. Contact Us</h2>
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
