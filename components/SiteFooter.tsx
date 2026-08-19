import Image from "next/image";

export default function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-teal-tint bg-teal px-6 py-4">
      <div className="mx-auto flex max-w-6xl items-center justify-center">
        <Image
          src="/wanderlust-wordmark.png"
          alt="Wanderlust Careers"
          width={180}
          height={48}
          className="h-10 w-auto object-contain opacity-95"
        />
      </div>
    </footer>
  );
}
