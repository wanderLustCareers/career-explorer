import Image from "next/image";

// Transparent PNG — avoids the baked-in white box from the JPG on Vercel.
const LOGO_WITH_TEXT = "/wanderlust_careers_logo_with_text.png";

interface BrandMarkProps {
  compact?: boolean;
}

export default function BrandMark({ compact = false }: BrandMarkProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <Image
          src={LOGO_WITH_TEXT}
          alt="Wanderlust Careers"
          width={60}
          height={32}
          unoptimized
          className="h-8 w-auto object-contain"
          priority
        />
        <div className="hidden h-6 w-px bg-teal-tint sm:block" aria-hidden="true" />
        <p className="font-display text-xl text-ink">Career Explorer</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-5">
      <Image
        src={LOGO_WITH_TEXT}
        alt="Wanderlust Careers"
        width={139}
        height={74}
        unoptimized
        className="h-[74px] w-auto object-contain"
        priority
      />
      <p className="font-display text-5xl text-ink">Career Explorer</p>
    </div>
  );
}
