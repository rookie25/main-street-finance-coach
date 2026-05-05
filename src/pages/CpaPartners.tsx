import { Link } from "react-router-dom";
import { ArrowRight, FileText, Receipt, Car, Percent, Wallet, FileSpreadsheet, Scale, Clock, TrendingUp, Coins, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import Reveal from "@/components/Reveal";
import SectionHeader from "@/components/SectionHeader";

const deliverables = [
  { icon: FileText, label: "P&L Statement", desc: "Revenue, COGS, expenses, net income" },
  { icon: Receipt, label: "Expense Detail", desc: "Each line with receipts attached" },
  { icon: Car, label: "Mileage log", desc: "IRS-compliant, ready to file" },
  { icon: Percent, label: "Sales tax summary", desc: "Confirmed monthly" },
  { icon: Wallet, label: "Payroll summary", desc: "All filings reconciled" },
  { icon: FileSpreadsheet, label: "Loan amortization", desc: "Schedules & balances" },
  { icon: Scale, label: "Balance sheet", desc: "Assets, liabilities, equity" },
];

const benefits = [
  { icon: Clock, title: "Zero chasing", body: "Books arrive clean and complete on the 1st. No follow-up needed." },
  { icon: TrendingUp, title: "Higher value work", body: "Spend your time on tax strategy and advisory, not data entry." },
  { icon: Coins, title: "Revenue share", body: "Earn referral income for every client you send our way." },
];

const never = [
  "We never prepare or sign tax returns (that's your role).",
  "We never give tax advice.",
  "We never contact your clients without your knowledge.",
];

export default function CpaPartners() {
  return (
    <>
      <section className="bg-gradient-hero text-primary-foreground py-24 md:py-32 -mt-20 pt-44">
        <div className="container-prose text-center max-w-3xl">
          <Reveal>
            <div className="text-xs uppercase tracking-[0.2em] text-accent mb-5">For CPA Partners</div>
            <h1 className="font-display text-5xl md:text-6xl font-semibold leading-[1.05] text-balance">
              Your clients' books. <span className="italic text-accent">Done.</span> Delivered on the 1st.
            </h1>
            <p className="mt-6 text-lg md:text-xl text-primary-foreground/80 leading-relaxed">
              Partner with Desired Labs and spend your time on what only you can do — review, advise, and sign. We handle everything else.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="py-20 bg-background">
        <div className="container-prose">
          <SectionHeader eyebrow="Monthly package" title="What we deliver to you" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {deliverables.map((d, i) => (
              <Reveal key={d.label} delay={i * 60}>
                <div className="bg-card border border-border rounded-2xl p-6 shadow-soft hover:shadow-card transition-all flex items-start gap-4">
                  <div className="w-11 h-11 rounded-lg bg-accent/10 text-accent flex items-center justify-center shrink-0">
                    <d.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-primary">{d.label}</div>
                    <div className="text-sm text-muted-foreground mt-1">{d.desc}</div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-subtle">
        <div className="container-prose">
          <SectionHeader eyebrow="Why partner" title="Why CPAs partner with us" />
          <div className="grid md:grid-cols-3 gap-6">
            {benefits.map((b, i) => (
              <Reveal key={b.title} delay={i * 100}>
                <div className="h-full bg-card border border-border rounded-2xl p-8 shadow-soft hover:shadow-card transition-all">
                  <div className="w-12 h-12 rounded-xl bg-gradient-gold text-accent-foreground flex items-center justify-center mb-5">
                    <b.icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-display text-xl font-semibold text-primary mb-2">{b.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{b.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-background">
        <div className="container-prose max-w-3xl">
          <SectionHeader eyebrow="Boundaries" title="What we never do" align="left" />
          <ul className="space-y-4">
            {never.map((n) => (
              <li key={n} className="flex items-start gap-3 p-5 bg-secondary rounded-xl">
                <X className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <span className="text-foreground">{n}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="py-24 bg-primary text-primary-foreground relative overflow-hidden">
        <div className="absolute -top-32 -right-20 w-96 h-96 rounded-full bg-accent/15 blur-3xl" />
        <div className="container-prose text-center relative">
          <h2 className="font-display text-4xl md:text-5xl font-semibold text-balance leading-[1.1]">
            Let's build a partnership that works for both sides.
          </h2>
          <div className="mt-10">
            <Button asChild variant="gold" size="xl">
              <Link to="/contact">Explore a Partnership <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
