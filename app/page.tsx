import SearchForm from "@/components/SearchForm";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6">
      <h1 className="font-display text-5xl text-ink">Career Explorer</h1>
      <SearchForm />
    </main>
  );
}
