import { ArrowRight, CreditCard, Building2, Mail, MessageCircle, Calculator, Users, Database, Brain, FileBarChart, Bell, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Reveal from "@/components/Reveal";
import SectionHeader from "@/components/SectionHeader";

const sources = [
  { icon: CreditCard, name: "Square POS", desc: "Real-time sales sync" },
  { icon: Building2, name: "Plaid (bank)", desc: "Every transaction, daily" },
  { icon: Mail, name: "Gmail invoices", desc: "Inbox parsing & matching" },
  { icon: MessageCircle, name: "WhatsApp receipts", desc: "Snap, send, captured" },
  { icon: Calculator, name: "QuickBooks", desc: "Two-way sync if needed" },
  { icon: Users, name: "Payroll systems", desc: "Gusto, Square Payroll, more" },
];

const automated = [
  "Daily P&L generation",
  "Expense categorization",
  "Receipt processing & OCR",
  "Mileage tracking",
  "Sales tax calculation",
  "Payroll filing",
];

const received = [
  { time: "6:45 AM", title: "Daily WhatsApp briefing", body: "Yesterday's revenue, anomalies, what to know today." },
  { time: "Weekly", title: "P&L report", body: "Trends, top expenses, margin movement." },
  { time: "1st of month", title: "CPA package", body: "Clean books, mileage, balance sheet, ready to sign." },
  { time: "Always", title: "Compliance calendar alerts", body: "Filing deadlines pushed before they hurt." },
];

const human = [
  "Annual tax return — your CPA signs",
  "Strategic decisions — you decide",
  "Vendor relationships — your choice",
];

export default function HowItWorks() {
  return (
    <>
      <section className="bg-gradient-hero text-primary-foreground py-24 md:py-32 -mt-20 pt-44">
        <div className="container-prose text-center max-w-3xl">
          <Reveal>
            <div className="text-xs uppercase tracking-[0.2em] text-accent mb-5">How it works</div>
            <h1 className="font-display text-5xl md:text-6xl font-semibold leading-[1.05] text-balance">
              The full platform, end to end.
            </h1>
            <p className="mt-6 text-lg md:text-xl text-primary-foreground/80 leading-relaxed">
              We connect to the tools you already use, automate the parts that drain your time, and hand the clean output to you and your CPA.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Flow diagram */}
      <section className="py-20 bg-background">
        <div className="container-prose">
          <Reveal>
            <div className="bg-card rounded-3xl border border-border shadow-soft p-8 md:p-12 grid md:grid-cols-3 gap-6 items-center">
              <Step icon={Database} label="Data in" sub="Square · Bank · Email · WhatsApp" />
              <div className="hidden md:flex justify-center text-accent"><ArrowRight className="h-6 w-6" /></div>
              <Step icon={Brain} label="AI processing" sub="Capture · Categorize · Verify" tone="primary" />
              <div className="hidden md:col-start-2 md:row-start-2 md:flex justify-center text-accent"><ArrowRight className="h-6 w-6 rotate-90 md:rotate-0" /></div>
              <div className="md:col-start-3 md:row-start-1">
                <Step icon={FileBarChart} label="Reports out" sub="Daily · Weekly · Monthly" />
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="py-20 bg-gradient-subtle">
        <div className="container-prose">
          <SectionHeader eyebrow="01" title="Data sources we connect" subtitle="Plug into the systems you already run. Setup takes under an hour." />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {sources.map((s, i) => (
              <Reveal key={s.name} delay={i * 60}>
                <div className="bg-card border border-border rounded-2xl p-6 shadow-soft hover:shadow-card transition-all flex items-start gap-4">
                  <div className="w-11 h-11 rounded-lg bg-primary/5 text-primary flex items-center justify-center shrink-0">
                    <s.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">{s.name}</div>
                    <div className="text-sm text-muted-foreground mt-1">{s.desc}</div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-background">
        <div className="container-prose grid md:grid-cols-2 gap-16">
          <Reveal>
            <div className="text-xs uppercase tracking-[0.2em] text-accent mb-3">02</div>
            <h2 className="font-display text-3xl md:text-4xl font-semibold text-primary mb-6">What we automate</h2>
            <ul className="space-y-3">
              {automated.map((a) => (
                <li key={a} className="flex items-start gap-3 text-foreground">
                  <Check className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={120}>
            <div className="text-xs uppercase tracking-[0.2em] text-accent mb-3">04</div>
            <h2 className="font-display text-3xl md:text-4xl font-semibold text-primary mb-6">What stays human</h2>
            <ul className="space-y-3">
              {human.map((a) => (
                <li key={a} className="flex items-start gap-3 text-foreground">
                  <Bell className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span>{a}</span>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-sm text-muted-foreground italic">
              We never replace judgment. We replace busywork.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="py-20 bg-gradient-subtle">
        <div className="container-prose">
          <SectionHeader eyebrow="03" title="What you receive" />
          <div className="grid md:grid-cols-2 gap-5 max-w-4xl mx-auto">
            {received.map((r, i) => (
              <Reveal key={r.title} delay={i * 80}>
                <div className="bg-card border border-border rounded-2xl p-6 shadow-soft">
                  <div className="text-xs font-semibold tracking-wider text-accent uppercase">{r.time}</div>
                  <div className="font-display text-xl font-semibold text-primary mt-2">{r.title}</div>
                  <p className="text-muted-foreground mt-2 leading-relaxed">{r.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 bg-background">
        <div className="container-prose text-center">
          <h2 className="font-display text-4xl md:text-5xl font-semibold text-primary text-balance">
            See how it would work for your business.
          </h2>
          <div className="mt-8">
            <Button asChild variant="brand" size="xl">
              <Link to="/contact">Get a Free Assessment <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}

function Step({ icon: Icon, label, sub, tone }: { icon: any; label: string; sub: string; tone?: "primary" }) {
  return (
    <div className={"text-center p-6 rounded-2xl " + (tone === "primary" ? "bg-primary text-primary-foreground" : "bg-secondary")}>
      <div className={"w-14 h-14 mx-auto rounded-xl flex items-center justify-center mb-4 " + (tone === "primary" ? "bg-primary-foreground/10 text-accent" : "bg-card text-primary")}>
        <Icon className="h-7 w-7" />
      </div>
      <div className="font-display text-xl font-semibold">{label}</div>
      <div className={"text-sm mt-1 " + (tone === "primary" ? "text-primary-foreground/75" : "text-muted-foreground")}>{sub}</div>
    </div>
  );
}
