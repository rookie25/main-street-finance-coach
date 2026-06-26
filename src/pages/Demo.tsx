import { useEffect } from "react";

// Demo / free-assessment landing page. The business-card QR points here.
// Shows the demo video, then a "Book your free assessment" call to action.
//
// 🔧 TO WIRE BOOKING: replace BOOKING_URL with your Cal.com / Calendly link once
// set up. Until then it opens an email so the CTA still works.
const BOOKING_URL = "mailto:vishal@desiredlabs.ai?subject=Free%20Financial%20Assessment";
const VIDEO_URL =
  "https://afygsdlzrfgsvbhkvtxc.supabase.co/storage/v1/object/public/public-media/demo/desired_labs_demo.mp4?v=2";

export default function Demo() {
  useEffect(() => {
    document.title = "Desired Labs — Watch the demo";
  }, []);

  return (
    <div className="min-h-screen bg-gradient-hero text-white flex flex-col items-center px-5 py-10">
      {/* Brand lockup */}
      <div className="flex items-center gap-2 mb-8">
        <svg width="34" height="34" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
          <rect width="64" height="64" rx="14" fill="#0D1B2A" />
          <text x="30" y="44" fontFamily="Inter, sans-serif" fontSize="36" fontWeight="800" fill="#fff" textAnchor="middle">D</text>
          <circle cx="46" cy="18" r="8" fill="#C47A2C" />
        </svg>
        <span className="font-display text-2xl font-semibold">
          Desired <span className="text-accent">Labs</span>
        </span>
      </div>

      {/* Headline */}
      <h1 className="font-display text-3xl md:text-5xl font-semibold text-center leading-[1.1] max-w-3xl text-balance">
        See your books run themselves.
      </h1>
      <p className="mt-4 text-center text-white/70 max-w-xl text-base md:text-lg">
        AI bookkeeping and a 24/7 CFO for your business. Watch the two-minute demo, then
        grab a free financial assessment — we'll show you exactly what we'd find in your numbers.
      </p>

      {/* Video */}
      <div className="w-full max-w-3xl mt-8 rounded-2xl overflow-hidden shadow-elegant ring-1 ring-white/10 bg-black">
        <video
          src={VIDEO_URL}
          controls
          playsInline
          preload="metadata"
          className="w-full h-auto block"
        />
      </div>

      {/* CTA */}
      <a
        href={BOOKING_URL}
        className="mt-9 inline-flex items-center justify-center rounded-xl bg-accent px-8 py-4 text-lg font-semibold text-white shadow-elegant hover:opacity-90 transition"
      >
        Book your free assessment →
      </a>
      <a href="https://desiredlabs.ai" className="mt-4 text-sm text-white/60 hover:text-white/90">
        desiredlabs.ai
      </a>

      <p className="mt-10 text-xs text-white/40 text-center max-w-md">
        AI Bookkeeping &amp; CFO Services. Not a CPA firm; we do not prepare or sign tax returns.
      </p>
    </div>
  );
}
