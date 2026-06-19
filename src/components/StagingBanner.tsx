// A small fixed badge shown on non-production builds so staging can never be
// mistaken for prod. Driven by VITE_APP_ENV (unset/"production" => hidden).
const ENV = (import.meta.env.VITE_APP_ENV as string | undefined) ?? "production";

export default function StagingBanner() {
  if (ENV === "production") return null;
  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        bottom: 8,
        left: 8,
        zIndex: 9999,
        background: "#B45309",
        color: "#fff",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        padding: "3px 8px",
        borderRadius: 6,
        opacity: 0.92,
        pointerEvents: "none",
      }}
    >
      {ENV} · test data
    </div>
  );
}
