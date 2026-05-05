import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, Receipt, FileCheck2, Sun, Eye, Wallet, AlertTriangle, Plug, Brain, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Reveal from "@/components/Reveal";
import SectionHeader from "@/components/SectionHeader";
import DashboardMockup from "@/components/DashboardMockup";

const problems = [
  { icon: Eye, title: "Flying blind every month", body: "Most small business owners see their numbers quarterly. By then it's too late to act." },
  { icon: Wallet, title: "Paying too much for too little", body: "Bookkeepers, payroll services, QuickBooks — it adds up to $800–1,000/month for basic reports." },
  { icon: AlertTriangle, title: "Tax surprises that hurt", body: "Missed filings, wrong categorizations, deductions you never knew existed." },
];

const features = [
  { icon: Sun, title: "Daily Briefings", body: "Every morning, know exactly where your business stands. Revenue, expenses, anomalies, recommendations." },
  { icon: Receipt, title: "Automated Bookkeeping", body: "WhatsApp a receipt. Email an invoice. Done. Every expense captured, categorized, and logged in real time." },
  { icon: FileCheck2, title: "Tax Filing & Compliance", body: "Sales tax, quarterly estimates, payroll taxes — filed automatically. Never miss a deadline again." },
  { icon: Sparkles, title: "Monthly CPA Package", body: "Clean, accurate books delivered to your CPA on the 1st of every month. No back and forth. Just sign and file." },
];

const steps = [
  { icon: Plug, title: "We connect", body: "Square, bank, payroll, and email — linked securely in under an hour." },
  { icon: Brain, title: "Our AI captures", body: "Every transaction, receipt, and invoice — automatically, 24/7." },
  { icon: BarChart3, title: "You get clarity", body: "Daily briefings, monthly reports, zero tax surprises." },
];

export default function Home() {
  return (
    <>
      {/* HERO */}
      <section className="relative -mt-20 pt-28 pb-24 md:pt-40 md:pb-32 overflow-hidden bg-gradient-hero text-primary-foreground">
        <div className="absolute inset-0 opacity-[0.07] pointer-events-none" style={{
          backgroundImage: "radial-gradient(circle at 20% 20%, hsl(28 64% 47%) 0%, transparent 40%), radial-gradient(circle at 80% 70%, hsl(147 50% 60%) 0%, transparent 45%)",
        }} />
        <div className="container-prose relative grid lg:grid-cols-2 gap-16 items-center">
          <Reveal>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-foreground/10 backdrop-blur border border-primary-foreground/15 text-xs font-medium tracking-wide mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              The AI CFO for Main Street
            </div>
            <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-semibold leading-[1.05] text-balance">
              Your business deserves a CFO. <span className="text-accent italic">Now it can have one.</span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-primary-foreground/80 max-w-xl leading-relaxed">
              Desired Labs replaces your bookkeeper, automates your tax filings, and gives you daily financial clarity — for a fraction of what you're paying today.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Button asChild variant="gold" size="lg">
                <Link to="/how-it-works">See How It Works <ArrowRight className="ml-1 h-4 w-4" /></Link>
              </Button>
              <Button asChild variant="outlineLight" size="lg">
                <Link to="/cpa-partners">For CPA Partners</Link>
              </Button>
            </div>
          </Reveal>

          <Reveal delay={150}>
            <div className="relative">
              <div className="absolute -inset-6 bg-accent/10 blur-3xl rounded-full" />
              <div className="relative shadow-elegant rounded-2xl overflow-hidden">
                <DashboardMockup />
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* PROBLEM */}
      <section className="py-24 bg-background">
        <div className="container-prose">
          <SectionHeader
            eyebrow="The reality"
            title="What's quietly costing Main Street businesses"
          />
          <div className="grid md:grid-cols-3 gap-6">
            {problems.map((p, i) => (
              <Reveal key={p.title} delay={i * 100}>
                <div className="h-full bg-card rounded-2xl p-8 border border-border shadow-soft hover:shadow-card transition-all hover:-translate-y-1">
                  <div className="w-12 h-12 rounded-xl bg-primary/5 text-primary flex items-center justify-center mb-6">
                    <p.icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-display text-xl font-semibold text-primary mb-2">{p.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{p.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* SOLUTION */}
      <section className="py-24 bg-gradient-subtle">
        <div className="container-prose">
          <SectionHeader
            eyebrow="The platform"
            title="We built the financial system your business deserves"
          />
          <div className="grid md:grid-cols-2 gap-6">
            {features.map((f, i) => (
              <Reveal key={f.title} delay={i * 80}>
                <div className="group relative h-full bg-card rounded-2xl p-8 border border-border shadow-soft hover:shadow-card transition-all">
                  <div className="flex items-start gap-5">
                    <div className="w-12 h-12 shrink-0 rounded-xl bg-gradient-gold text-accent-foreground flex items-center justify-center shadow-soft">
                      <f.icon className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-display text-2xl font-semibold text-primary mb-2">{f.title}</h3>
                      <p className="text-muted-foreground leading-relaxed">{f.body}</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* PROOF */}
      <section className="py-24 bg-background">
        <div className="container-prose">
          <SectionHeader eyebrow="Proof" title="Real results for real businesses" />
          <Reveal>
            <div className="max-w-4xl mx-auto bg-primary text-primary-foreground rounded-3xl p-10 md:p-14 shadow-elegant relative overflow-hidden">
              <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-accent/20 blur-3xl" />
              <div className="relative">
                <div className="text-xs uppercase tracking-[0.2em] text-accent mb-4">Case Study</div>
                <h3 className="font-display text-2xl md:text-3xl font-semibold mb-8 max-w-2xl">
                  Independent coffee shop, Stockton CA
                </h3>
                <div className="grid md:grid-cols-2 gap-10">
                  <div>
                    <div className="text-xs uppercase tracking-wider text-primary-foreground/60 mb-3">Before</div>
                    <ul className="space-y-2 text-primary-foreground/85">
                      <li>• Quarterly books, no daily visibility</li>
                      <li>• $991/month in bookkeeping & software fees</li>
                      <li>• Manual receipts, missed deductions</li>
                    </ul>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wider text-accent mb-3">After</div>
                    <ul className="space-y-2 text-primary-foreground">
                      <li>• Daily briefings via WhatsApp</li>
                      <li>• 94% automated bookkeeping accuracy</li>
                      <li>• <span className="text-accent font-semibold">$548/month saved</span></li>
                      <li>• Missed tax filing caught within 5 days</li>
                    </ul>
                  </div>
                </div>
                <p className="mt-10 text-xs text-primary-foreground/50 italic">
                  Client name withheld — results from active engagement.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-24 bg-gradient-subtle">
        <div className="container-prose">
          <SectionHeader eyebrow="How it works" title="From chaos to clarity in three steps" />
          <div className="grid md:grid-cols-3 gap-8 relative">
            {steps.map((s, i) => (
              <Reveal key={s.title} delay={i * 120}>
                <div className="relative">
                  <div className="text-7xl font-display font-semibold text-accent/20 leading-none mb-2">0{i + 1}</div>
                  <div className="w-12 h-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center mb-5">
                    <s.icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-display text-2xl font-semibold text-primary mb-2">{s.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{s.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-background">
        <div className="container-prose">
          <Reveal>
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="font-display text-4xl md:text-5xl font-semibold text-primary text-balance leading-[1.1]">
                Ready to know your numbers?
              </h2>
              <p className="mt-5 text-lg text-muted-foreground">
                Custom pricing based on your business size and needs. Most clients save more than they spend.
              </p>
              <div className="mt-10">
                <Button asChild variant="brand" size="xl">
                  <Link to="/contact">Get a Free Assessment <ArrowRight className="ml-1 h-4 w-4" /></Link>
                </Button>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
