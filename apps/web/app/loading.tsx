export default function Loading() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-3 py-24 text-center">
      <div className="size-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
      <p className="text-sm text-zinc-500">Loading…</p>
    </div>
  )
}
