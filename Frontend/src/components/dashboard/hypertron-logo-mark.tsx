const SHAPE24_PATH =
  "M16 0L20.5255 11.4745L32 16L20.5255 20.5255L16 32L11.4745 20.5255L0 16L11.4745 11.4745L16 0Z";

export function HypertronLogoMark({
  size = 32,
  variant = "light",
}: {
  size?: number;
  variant?: "light" | "brand";
}) {
  const isBrand = variant === "brand";
  const iconSize = Math.round((size / 100) * (isBrand ? 64 : 50));

  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full"
      style={{
        width: size,
        height: size,
        background: isBrand
          ? "radial-gradient(circle at 50% 38%, #5B8CFF 0%, #1B4ED8 48%, #0B1B4A 100%)"
          : "#E8F4FF",
        boxShadow: isBrand ? "0 0 12px rgba(80, 130, 255, 0.45)" : undefined,
      }}
      role="img"
      aria-label="Hypertron"
    >
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <path d={SHAPE24_PATH} fill={isBrand ? "#FFFFFF" : "#2563EB"} />
      </svg>
    </div>
  );
}
