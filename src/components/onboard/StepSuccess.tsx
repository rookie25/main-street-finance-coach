import { CheckCircle2 } from "lucide-react";

export default function StepSuccess({ businessName }: { businessName: string | null }) {
  return (
    <div className="text-center py-6">
      <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-primary/5 flex items-center justify-center">
        <CheckCircle2 className="h-8 w-8 text-primary" />
      </div>
      <h2 className="font-display text-3xl font-semibold text-primary mb-3">
        You're all set{businessName ? `, ${businessName}` : ""}!
      </h2>
      <p className="text-muted-foreground max-w-md mx-auto">
        Payment received and your account is now active. Here's what happens next:
      </p>
      <ol className="text-left text-sm text-muted-foreground max-w-md mx-auto mt-6 space-y-3">
        <li className="flex gap-3">
          <span className="font-semibold text-accent">1.</span>
          Our team verifies your connected accounts within 1 business day.
        </li>
        <li className="flex gap-3">
          <span className="font-semibold text-accent">2.</span>
          We send a welcome email with your dashboard login and first-month timeline.
        </li>
        <li className="flex gap-3">
          <span className="font-semibold text-accent">3.</span>
          Your books start flowing automatically — no spreadsheets required.
        </li>
      </ol>
      <p className="text-sm text-muted-foreground mt-8">
        Questions? Email <a className="text-accent hover:underline" href="mailto:hello@desiredlabs.com">hello@desiredlabs.com</a>.
      </p>
    </div>
  );
}
