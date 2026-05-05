interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: "left" | "center";
  invert?: boolean;
}

export default function SectionHeader({
  eyebrow,
  title,
  subtitle,
  align = "center",
  invert = false,
}: SectionHeaderProps) {
  return (
    <div
      className={
        (align === "center" ? "text-center mx-auto " : "text-left ") +
        "max-w-3xl mb-14"
      }
    >
      {eyebrow && (
        <div
          className={
            "text-xs uppercase tracking-[0.2em] font-medium mb-4 " +
            (invert ? "text-accent" : "text-accent")
          }
        >
          {eyebrow}
        </div>
      )}
      <h2
        className={
          "font-display text-4xl md:text-5xl font-semibold text-balance leading-[1.1] " +
          (invert ? "text-primary-foreground" : "text-primary")
        }
      >
        {title}
      </h2>
      {subtitle && (
        <p
          className={
            "mt-5 text-lg leading-relaxed text-balance " +
            (invert ? "text-primary-foreground/75" : "text-muted-foreground")
          }
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}
