import { useState, type FormEvent } from "react";
import { z } from "zod";
import { Mail, Clock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import Reveal from "@/components/Reveal";

const schema = z.object({
  name: z.string().trim().min(1, "Required").max(100),
  business: z.string().trim().min(1, "Required").max(120),
  type: z.string().min(1, "Required"),
  revenue: z.string().min(1, "Required"),
  spend: z.string().min(1, "Required"),
  cpa: z.boolean(),
  message: z.string().max(1000).optional(),
});

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);
  const [cpa, setCpa] = useState(false);
  const [type, setType] = useState("");
  const [revenue, setRevenue] = useState("");
  const [spend, setSpend] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = {
      name: String(fd.get("name") || ""),
      business: String(fd.get("business") || ""),
      type, revenue, spend, cpa,
      message: String(fd.get("message") || ""),
    };
    const parsed = schema.safeParse(data);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach((i) => { errs[String(i.path[0])] = i.message; });
      setErrors(errs);
      toast.error("Please complete the required fields.");
      return;
    }
    setErrors({});
    setSubmitted(true);
    toast.success("Thanks — we'll be in touch within 1 business day.");
  }

  return (
    <>
      <section className="bg-gradient-hero text-primary-foreground py-24 md:py-28 -mt-20 pt-40">
        <div className="container-prose text-center max-w-3xl">
          <Reveal>
            <div className="text-xs uppercase tracking-[0.2em] text-accent mb-5">Get started</div>
            <h1 className="font-display text-5xl md:text-6xl font-semibold leading-[1.05] text-balance">
              Let's talk about your business.
            </h1>
            <p className="mt-6 text-lg md:text-xl text-primary-foreground/80">
              No sales pitch. Just an honest conversation about whether we're the right fit.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="py-20 bg-background">
        <div className="container-prose max-w-2xl">
          {submitted ? (
            <Reveal>
              <div className="bg-card border border-border rounded-3xl p-12 text-center shadow-card">
                <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-primary/5 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-primary" />
                </div>
                <h2 className="font-display text-3xl font-semibold text-primary mb-3">Request received</h2>
                <p className="text-muted-foreground">We'll be in touch within 1 business day at the email you provided.</p>
              </div>
            </Reveal>
          ) : (
            <Reveal>
              <form
                onSubmit={onSubmit}
                className="bg-card border border-border rounded-3xl p-8 md:p-10 shadow-card space-y-6"
              >
                <Field label="Your name" error={errors.name}>
                  <Input name="name" placeholder="Jane Doe" maxLength={100} required />
                </Field>
                <Field label="Business name" error={errors.business}>
                  <Input name="business" placeholder="Main Street Coffee Co." maxLength={120} required />
                </Field>
                <Field label="Business type" error={errors.type}>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger><SelectValue placeholder="Select one" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="restaurant">Restaurant / Cafe</SelectItem>
                      <SelectItem value="retail">Retail</SelectItem>
                      <SelectItem value="service">Service Business</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Monthly revenue range" error={errors.revenue}>
                  <Select value={revenue} onValueChange={setRevenue}>
                    <SelectTrigger><SelectValue placeholder="Select one" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="<10">Under $10K</SelectItem>
                      <SelectItem value="10-25">$10K – $25K</SelectItem>
                      <SelectItem value="25-50">$25K – $50K</SelectItem>
                      <SelectItem value="50+">$50K+</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Current bookkeeping spend" error={errors.spend}>
                  <Select value={spend} onValueChange={setSpend}>
                    <SelectTrigger><SelectValue placeholder="Select one" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="<200">Under $200</SelectItem>
                      <SelectItem value="200-500">$200 – $500</SelectItem>
                      <SelectItem value="500-1000">$500 – $1,000</SelectItem>
                      <SelectItem value="1000+">$1,000+</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                <div className="flex items-center justify-between p-4 rounded-xl bg-secondary">
                  <div>
                    <div className="font-medium">Are you a CPA looking to partner?</div>
                    <div className="text-sm text-muted-foreground">We'll route you to our partnerships team.</div>
                  </div>
                  <Switch checked={cpa} onCheckedChange={setCpa} />
                </div>

                <Field label="Message (optional)">
                  <Textarea name="message" rows={4} maxLength={1000} placeholder="Anything we should know?" />
                </Field>

                <Button type="submit" variant="brand" size="xl" className="w-full">
                  Request Free Assessment
                </Button>
              </form>
            </Reveal>
          )}

          <div className="mt-10 grid sm:grid-cols-2 gap-4 text-center">
            <div className="p-5 rounded-xl bg-secondary">
              <Mail className="h-5 w-5 text-accent mx-auto mb-2" />
              <a href="mailto:hello@desiredlabs.com" className="font-medium hover:text-accent">hello@desiredlabs.com</a>
            </div>
            <div className="p-5 rounded-xl bg-secondary">
              <Clock className="h-5 w-5 text-accent mx-auto mb-2" />
              <div className="font-medium">We respond within 1 business day</div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
