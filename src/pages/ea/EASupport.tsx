// EA Portal — tech support chat with Desired Labs.
import SupportChat from "@/components/support/SupportChat";
import { eaGetSupport, eaSendSupport } from "@/lib/supportApi";

export default function EASupport() {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
      <h1 className="font-display text-xl font-semibold text-primary mb-4">Support</h1>
      <div className="bg-card border border-border rounded-2xl overflow-hidden h-[calc(100vh-12rem)]">
        <SupportChat load={eaGetSupport} send={eaSendSupport} embedded />
      </div>
    </div>
  );
}
