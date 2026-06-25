import { Link } from "react-router-dom";
import { ArrowRight, Shield, Target, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import Reveal from "@/components/Reveal";
import SectionHeader from "@/components/SectionHeader";

const values = [
  { icon: Shield, title: "Never disrupt", body: "We run parallel until proven. Your existing system stays live until ours is provably better." },
  { icon: Target, title: "Accuracy over speed", body: "We verify before we automate. Wrong numbers cost more than late ones." },
  { icon: Lock, title: "Your data, your control", body: "We never own your credentials. Disconnect at any time, take everything with you." },
];

export default function About() {
  return (
    <>
      <section className="bg-gradient-hero text-primary-foreground py-24 md:py-32 -mt-20 pt-44">
        <div className="container-prose text-center max-w-3xl">
          <Reveal>
            <div className="text-xs uppercase tracking-[0.2em] text-accent mb-5">About</div>
            <h1 className="font-display text-4xl md:text-6xl font-semibold leading-[1.1] text-balance">
              Built by someone who believes every business deserves better.
            </h1>
          </Reveal>
        </div>
      </section>

      <section className="py-20 bg-background">
        <div className="container-prose max-w-3xl">
          <Reveal>
            <p className="text-lg md:text-xl leading-relaxed text-foreground/85">
              Desired Labs was founded to solve a problem we saw everywhere — businesses paying hundreds of dollars a month for quarterly reports they couldn't act on, missing filings they didn't know about, and making decisions without real numbers.
            </p>
            <p className="text-lg md:text-xl leading-relaxed text-foreground/85 mt-6">
              We built the system we wished existed.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="py-20 bg-gradient-subtle">
        <div className="container-prose max-w-4xl">
          <Reveal>
            <div className="bg-primary text-primary-foreground rounded-3xl p-10 md:p-16 shadow-elegant relative overflow-hidden">
              <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-accent/15 blur-3xl" />
              <div className="relative">
                <div className="text-xs uppercase tracking-[0.2em] text-accent mb-5">Our mission</div>
                <p className="font-display text-2xl md:text-4xl leading-tight text-balance italic">
                  "Every business deserves the financial clarity that enterprise companies take for granted."
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="py-20 bg-background">
        <div className="container-prose max-w-3xl">
          <Reveal>
            <div className="flex items-start gap-6">
              <div className="w-16 h-16 rounded-full bg-gradient-gold flex items-center justify-center shrink-0 font-display text-2xl font-semibold text-accent-foreground">
                V
              </div>
              <div>
                <div className="font-display text-2xl font-semibold text-primary">Vishal</div>
                <div className="text-sm text-accent uppercase tracking-wider mt-1">Founder, Desired Labs</div>
                <p className="mt-4 text-foreground/85 leading-relaxed">
                  Building AI systems for the businesses that make communities work.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="py-20 bg-gradient-subtle">
        <div className="container-prose">
          <SectionHeader eyebrow="Values" title="What we hold ourselves to" />
          <div className="grid md:grid-cols-3 gap-6">
            {values.map((v, i) => (
              <Reveal key={v.title} delay={i * 100}>
                <div className="h-full bg-card border border-border rounded-2xl p-8 shadow-soft hover:shadow-card transition-all">
                  <div className="w-12 h-12 rounded-xl bg-primary/5 text-primary flex items-center justify-center mb-5">
                    <v.icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-display text-xl font-semibold text-primary mb-2">{v.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{v.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 bg-background">
        <div className="container-prose text-center">
          <h2 className="font-display text-4xl md:text-5xl font-semibold text-primary text-balance">
            Want to see if we're the right fit?
          </h2>
          <div className="mt-8">
            <Button asChild variant="brand" size="xl">
              <Link to="/contact">Start the conversation <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
