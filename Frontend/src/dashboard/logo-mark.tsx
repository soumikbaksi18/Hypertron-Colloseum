const SHAPE24_PATH =
  'M16 0L20.5255 11.4745L32 16L20.5255 20.5255L16 32L11.4745 20.5255L0 16L11.4745 11.4745L16 0Z';

export function HypertronLogoMark({ size = 32 }: { size?: number }) {
  const iconSize = Math.round((size / 100) * 50);

  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-[#E8F4FF]"
      style={{ width: size, height: size }}
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
        <path d={SHAPE24_PATH} fill="#2563EB" />
      </svg>
    </div>
  );
}
