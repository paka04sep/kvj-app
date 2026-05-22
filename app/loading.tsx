export default function Loading() {
  return (
    <div className="flex flex-1 flex-col gap-5 animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-3 w-36 rounded-full bg-zinc-800/80" />
          <div className="h-8 w-56 rounded-full bg-zinc-800/70" />
        </div>
        <div className="hidden h-10 w-32 rounded-xl bg-zinc-800/60 md:block" />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="h-28 rounded-2xl border border-zinc-800/50 bg-zinc-900/40" />
        <div className="h-28 rounded-2xl border border-zinc-800/50 bg-zinc-900/40" />
        <div className="h-28 rounded-2xl border border-zinc-800/50 bg-zinc-900/40" />
      </div>

      <div className="min-h-0 flex-1 rounded-2xl border border-zinc-800/50 bg-zinc-900/30" />
    </div>
  )
}
