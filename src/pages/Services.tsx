import { Link } from "react-router-dom";
import { Receipt, Brain, ShieldCheck, FileSpreadsheet, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import Reveal from "@/components/Reveal";
import SectionHeader from "@/components/SectionHeader";

const services = [
  {
    icon: Receipt,
    title: "AI Bookkeeping",
    summary: "Receipts, invoices, and bank lines — captured and categorized automatically.",
    points: [
      "In-app receipt capture",
      "Gmail invoice processing",
      "Bank transaction categorization",
      "Real-time ledger",
      "Monthly CPA-ready export",
    ],
  },
  {
    icon: Brain,
    title: "Financial Intelligence",
    summary: "Numbers you can actually act on — every morning, every week, every month.",
    points: [
      "Daily morning briefing",
      "Weekly P&L report",
      "Monthly deduction report",
      "Anomaly detection",
      "Cash flow forecasting",
    ],
  },
  {
    icon: ShieldCheck,
    title: "Tax & Compliance",
    summary: "We track the deadlines so you never get a surprise letter again.",
    points: [
      "Monthly sales tax tracking",
      "Quarterly estimated payments",
      "Payroll tax automation",
      "Compliance calendar",
      "Filing deadline alerts",
    ],
  },
  {
    icon: FileSpreadsheet,
    title: "CPA Coordination",
    summary: "Clean books delivered to your CPA on the 1st. No back and forth.",
    points: [
      "Monthly package delivery",
      "Clean categorized books",
      "Mileage log included",
      "Loan amortization schedules",
      "Annual return preparation support",
    ],
  },
];

export default function Services() {
  return (
    <>
      <section className="bg-gradient-hero text-primary-foreground py-24 md:py-32 -mt-20 pt-44">
        <div className="container-prose text-center max-w-3xl">
          <Reveal>
            <div className="text-xs uppercase tracking-[0.2em] text-accent mb-5">Services</div>
            <h1 className="font-display text-5xl md:text-6xl font-semibold leading-[1.05] text-balance">
              Four pillars. One financial system.
            </h1>
            <p className="mt-6 text-lg md:text-xl text-primary-foreground/80">
              Mix what you need. We'll do the rest.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="py-20 bg-background">
        <div className="container-prose grid md:grid-cols-2 gap-6">
          {services.map((s, i) => (
            <Reveal key={s.title} delay={i * 80}>
              <div className="h-full bg-card border border-border rounded-2xl p-8 shadow-soft hover:shadow-card transition-all">
                <div className="flex items-start gap-5 mb-2">
                  <div className="w-12 h-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                    <s.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-display text-2xl font-semibold text-primary">{s.title}</h3>
                    <p className="text-muted-foreground mt-1">{s.summary}</p>
                  </div>
                </div>
                <Accordion type="single" collapsible className="mt-4">
                  <AccordionItem value="item" className="border-none">
                    <AccordionTrigger className="text-sm font-medium text-accent hover:no-underline py-2">
                      What's included
                    </AccordionTrigger>
                    <AccordionContent>
                      <ul className="space-y-2 pt-2">
                        {s.points.map((p) => (
                          <li key={p} className="flex items-start gap-2 text-foreground">
                            <span className="mt-2 w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                            <span>{p}</span>
                          </li>
                        ))}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="py-24 bg-gradient-subtle">
        <div className="container-prose">
          <SectionHeader
            eyebrow="Pricing"
            title="Pricing built around your business"
            subtitle="We don't believe in one-size-fits-all. Tell us about your business and we'll build a package that makes sense — and saves you more than it costs."
          />
          <Reveal>
            <div className="max-w-2xl mx-auto bg-card border border-border rounded-3xl p-10 md:p-14 text-center shadow-card">
              <div className="font-display text-3xl md:text-4xl font-semibold text-primary mb-4">
                Custom packages, transparent value
              </div>
              <p className="text-muted-foreground mb-8">
                Most clients replace <span className="font-semibold text-foreground">$600–1,000/month</span> in existing fees.
              </p>
              <Button asChild variant="brand" size="xl">
                <Link to="/contact">Request Custom Pricing <ArrowRight className="ml-1 h-4 w-4" /></Link>
              </Button>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
