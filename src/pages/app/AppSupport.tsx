// Client Portal — tech support chat with Desired Labs.
import SupportChat from "@/components/support/SupportChat";
import { clientGetSupport, clientSendSupport } from "@/lib/supportApi";

export default function AppSupport() {
  return <SupportChat load={clientGetSupport} send={clientSendSupport} />;
}
