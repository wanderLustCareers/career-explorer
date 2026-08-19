import Image from "next/image";

interface BrandMarkProps {
  compact?: boolean;
}

export default function BrandMark({ compact = false }: BrandMarkProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <Image
          src="/wanderlust-mark.jpg"
          alt="Wanderlust Careers"
          width={120}
          height={32}
          className="h-8 w-auto bg-canvas object-contain mix-blend-multiply"
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
        src="/wanderlust-mark.jpg"
        alt="Wanderlust Careers"
        width={280}
        height={74}
        className="h-[74px] w-auto bg-canvas object-contain mix-blend-multiply"
        priority
      />
      <p className="font-display text-5xl text-ink">Career Explorer</p>
    </div>
  );
}
