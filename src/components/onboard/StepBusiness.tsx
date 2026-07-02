import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel,
  SelectTrigger, SelectValue,
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
        <Input
          value={value.business_name}
          onChange={(e) => set("business_name", e.target.value)}
          placeholder="Acme Co."
          maxLength={120}
          required
        />
      </div>
      <div className="space-y-2">
        <Label>Owner name</Label>
        <Input
          value={value.owner_name}
          onChange={(e) => set("owner_name", e.target.value)}
          placeholder="Jane Doe"
          maxLength={100}
          required
        />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Email</Label>
          <Input
            type="email"
            value={value.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="jane@example.com"
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Phone</Label>
          <Input
            type="tel"
            value={value.phone}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="(555) 123-4567"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Business address</Label>
        <Input
          value={value.address}
          onChange={(e) => set("address", e.target.value)}
          placeholder="123 Main St, Springfield, IL"
        />
      </div>

      <div className="space-y-2">
        <Label>Business type</Label>
        <Select value={value.business_type} onValueChange={(v) => set("business_type", v)}>
          <SelectTrigger><SelectValue placeholder="Select one" /></SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Food &amp; Beverage</SelectLabel>
              <SelectItem value="coffee_shop">Coffee Shop / Café</SelectItem>
              <SelectItem value="restaurant">Restaurant</SelectItem>
              <SelectItem value="food_truck">Food Truck</SelectItem>
              <SelectItem value="bakery">Bakery</SelectItem>
              <SelectItem value="bar">Bar</SelectItem>
              <SelectItem value="ice_cream">Ice Cream Shop</SelectItem>
              <SelectItem value="pizza">Pizza</SelectItem>
              <SelectItem value="sandwich_deli">Sandwich / Deli</SelectItem>
            </SelectGroup>
            <SelectGroup>
              <SelectLabel>Retail</SelectLabel>
              <SelectItem value="retail">Retail (General)</SelectItem>
              <SelectItem value="clothing">Clothing Store</SelectItem>
              <SelectItem value="shoe_store">Shoe Store</SelectItem>
              <SelectItem value="gift_shop">Gift Shop</SelectItem>
              <SelectItem value="electronics">Electronics</SelectItem>
              <SelectItem value="furniture">Furniture</SelectItem>
              <SelectItem value="home_goods">Home Goods</SelectItem>
              <SelectItem value="sporting_goods">Sporting Goods</SelectItem>
              <SelectItem value="pet_store">Pet Store</SelectItem>
            </SelectGroup>
            <SelectGroup>
              <SelectLabel>Health &amp; Beauty</SelectLabel>
              <SelectItem value="hair_salon">Hair Salon</SelectItem>
              <SelectItem value="nail_salon">Nail Salon</SelectItem>
              <SelectItem value="spa">Spa</SelectItem>
              <SelectItem value="massage">Massage</SelectItem>
            </SelectGroup>
            <SelectGroup>
              <SelectLabel>Fitness</SelectLabel>
              <SelectItem value="gym">Gym</SelectItem>
              <SelectItem value="fitness_studio">Fitness Studio</SelectItem>
              <SelectItem value="yoga">Yoga Studio</SelectItem>
              <SelectItem value="pilates">Pilates</SelectItem>
              <SelectItem value="crossfit">CrossFit / Functional Fitness</SelectItem>
            </SelectGroup>
            <SelectGroup>
              <SelectLabel>Automotive</SelectLabel>
              <SelectItem value="auto_repair">Auto Repair Shop</SelectItem>
              <SelectItem value="mechanic">Mechanic</SelectItem>
            </SelectGroup>
            <SelectGroup>
              <SelectLabel>Construction &amp; Trades</SelectLabel>
              <SelectItem value="general_contractor">General Contractor</SelectItem>
              <SelectItem value="plumbing">Plumbing</SelectItem>
              <SelectItem value="electrical">Electrical</SelectItem>
              <SelectItem value="hvac">HVAC</SelectItem>
              <SelectItem value="roofing">Roofing</SelectItem>
              <SelectItem value="landscaping">Landscaping</SelectItem>
              <SelectItem value="concrete">Concrete / Masonry</SelectItem>
            </SelectGroup>
            <SelectGroup>
              <SelectLabel>Print</SelectLabel>
              <SelectItem value="print_shop">Print Shop</SelectItem>
            </SelectGroup>
            <SelectGroup>
              <SelectLabel>Other</SelectLabel>
              <SelectItem value="service">Service Business</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" variant="brand" size="xl" className="w-full" disabled={!valid}>
        Continue
      </Button>
    </form>
  );
}
