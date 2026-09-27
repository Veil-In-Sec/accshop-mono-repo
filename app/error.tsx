"use client"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-4 py-24 text-center">
      <h2 className="text-lg font-semibold text-white">Something went wrong</h2>
      <p className="text-sm text-zinc-500">
        {error.message || "Please try again. If the problem persists, contact support."}
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black hover:bg-zinc-200"
      >
        Try again
      </button>
    </div>
  )
}
