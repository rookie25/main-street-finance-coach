import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export interface BusinessDetails {
  business_name: string;
  owner_name: string;
  email: string;
  phone: string;
  address: string;
  business_type: string;
}

export default function StepBusiness({
  value, onChange, onNext,
}: {
  value: BusinessDetails;
  onChange: (v: BusinessDetails) => void;
  onNext: () => void;
}) {
  const set = <K extends keyof BusinessDetails>(k: K, v: BusinessDetails[K]) =>
    onChange({ ...value, [k]: v });

  const valid =
    value.business_name.trim() &&
    value.owner_name.trim() &&
    /\S+@\S+\.\S+/.test(value.email);

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (valid) onNext(); }}
      className="space-y-5"
    >
      <h2 className="font-display text-2xl font-semibold text-primary">Business details</h2>

      <div className="space-y-2">
        <Label>Business name</Label>
        <Input value={value.business_name} onChange={(e) => set("business_name", e.target.value)}
          placeholder="Main Street Coffee Co." maxLength={120} required />
      </div>
      <div className="space-y-2">
        <Label>Owner name</Label>
        <Input value={value.owner_name} onChange={(e) => set("owner_name", e.target.value)}
          placeholder="Jane Doe" maxLength={100} required />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Email</Label>
          <Input type="email" value={value.email} onChange={(e) => set("email", e.target.value)}
            placeholder="jane@example.com" required />
        </div>
        <div className="space-y-2">
          <Label>Phone</Label>
          <Input type="tel" value={value.phone} onChange={(e) => set("phone", e.target.value)}
            placeholder="(555) 123-4567" />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Business address</Label>
        <Input value={value.address} onChange={(e) => set("address", e.target.value)}
          placeholder="123 Main St, Springfield, IL" />
      </div>
      <div className="space-y-2">
        <Label>Business type</Label>
        <Select value={value.business_type} onValueChange={(v) => set("business_type", v)}>
          <SelectTrigger><SelectValue placeholder="Select one" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="restaurant">Restaurant / Cafe</SelectItem>
            <SelectItem value="retail">Retail</SelectItem>
            <SelectItem value="service">Service Business</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" variant="brand" size="xl" className="w-full" disabled={!valid}>
        Continue
      </Button>
    </form>
  );
}
