"use client"

import { Camera, ImageUp, X } from "lucide-react"
import * as React from "react"
import jsQR from "jsqr"

/**
 * Scans 2FA setup QR codes via webcam or image upload.
 * Returns the raw decoded text (usually an otpauth:// URI) — the parent
 * page parses it and the server validates everything before saving.
 */
export function TotpQrScanner({
  onDetected,
  onClose,
}: {
  onDetected: (text: string) => void
  onClose: () => void
}) {
  const [mode, setMode] = React.useState<"camera" | "upload">("camera")
  const [error, setError] = React.useState<string | null>(null)
  const [scanning, setScanning] = React.useState(false)
  const videoRef = React.useRef<HTMLVideoElement>(null)
  const streamRef = React.useRef<MediaStream | null>(null)
  const rafRef = React.useRef(0)
  const doneRef = React.useRef(false)

  const stopCamera = React.useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setScanning(false)
  }, [])

  React.useEffect(() => () => stopCamera(), [stopCamera])

  async function startCamera() {
    setError(null)
    doneRef.current = false
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera is not available in this browser.")
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      })
      streamRef.current = stream
      const video = videoRef.current
      if (!video) return
      video.srcObject = stream
      await video.play()
      setScanning(true)

      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d", { willReadFrequently: true })
      let lastScan = 0
      const loop = () => {
        if (doneRef.current) return
        rafRef.current = requestAnimationFrame(loop)
        const now = performance.now()
        if (now - lastScan < 250 || video.readyState !== video.HAVE_ENOUGH_DATA) return
        lastScan = now
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        if (!ctx || canvas.width === 0) return
        ctx.drawImage(video, 0, 0)
        const frame = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const found = jsQR(frame.data, frame.width, frame.height, {
          inversionAttempts: "attemptBoth",
        })
        if (found?.data) {
          doneRef.current = true
          stopCamera()
          onDetected(found.data)
        }
      }
      rafRef.current = requestAnimationFrame(loop)
    } catch (e) {
      setError(
        e instanceof DOMException && e.name === "NotAllowedError"
          ? "Camera access was denied. Allow camera access or upload a QR image instead."
          : "Could not start the camera. Try uploading a QR image instead.",
      )
    }
  }

  async function handleFile(file: File) {
    setError(null)
    try {
      const url = URL.createObjectURL(file)
      try {
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const el = new Image()
          el.onload = () => resolve(el)
          el.onerror = () => reject(new Error("unreadable"))
          el.src = url
        })
        const canvas = document.createElement("canvas")
        // Downscale huge screenshots for faster decode.
        const scale = Math.min(1, 1200 / Math.max(img.naturalWidth, img.naturalHeight))
        canvas.width = Math.max(1, Math.floor(img.naturalWidth * scale))
        canvas.height = Math.max(1, Math.floor(img.naturalHeight * scale))
        const ctx = canvas.getContext("2d", { willReadFrequently: true })
        if (!ctx) throw new Error("unreadable")
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        const frame = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const found = jsQR(frame.data, frame.width, frame.height, {
          inversionAttempts: "attemptBoth",
        })
        if (found?.data) onDetected(found.data)
        else setError("No QR code found in this image. Try a clearer screenshot.")
      } finally {
        URL.revokeObjectURL(url)
      }
    } catch {
      setError("Could not read this image. Try another file.")
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Scan 2FA QR code">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-popover">
        <div className="flex items-center justify-between px-5 py-4">
          <h3 className="text-sm font-semibold text-foreground">Scan setup QR code</h3>
          <button
            type="button"
            onClick={() => { stopCamera(); onClose() }}
            aria-label="Close scanner"
            className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex gap-2 px-5">
          <button
            type="button"
            onClick={() => setMode("camera")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-full px-3 py-2 text-xs font-semibold ${mode === "camera" ? "bg-[#5362AD] text-white" : "bg-muted text-muted-foreground hover:text-foreground"}`}
          >
            <Camera className="size-4" /> Camera
          </button>
          <button
            type="button"
            onClick={() => { stopCamera(); setMode("upload") }}
            className={`flex flex-1 items-center justify-center gap-2 rounded-full px-3 py-2 text-xs font-semibold ${mode === "upload" ? "bg-[#5362AD] text-white" : "bg-muted text-muted-foreground hover:text-foreground"}`}
          >
            <ImageUp className="size-4" /> Upload image
          </button>
        </div>

        <div className="p-5">
          {mode === "camera" ? (
            <div>
              <div className="relative overflow-hidden rounded-xl bg-black">
                <video ref={videoRef} playsInline muted className="h-64 w-full object-cover" />
                {scanning && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="size-48 rounded-xl border-2 border-[#8b9bff]/80 shadow-[0_0_0_4000px_rgba(0,0,0,0.45)]" />
                  </div>
                )}
                {!scanning && !error && (
                  <p className="absolute inset-0 flex items-center justify-center px-6 text-center text-xs text-zinc-400">
                    Position the 2FA setup QR code inside the frame.
                  </p>
                )}
              </div>
              {!scanning && (
                <button
                  type="button"
                  onClick={startCamera}
                  className="mt-4 w-full rounded-full bg-[#5362AD] py-2.5 text-xs font-bold text-white hover:bg-[#4351a0]"
                >
                  Start camera
                </button>
              )}
            </div>
          ) : (
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-muted px-4 py-10 text-center hover:border-[#5362AD]/60">
              <ImageUp className="size-6 text-muted-foreground" />
              <span className="text-xs text-foreground">Drop a QR screenshot here or click to browse</span>
              <span className="text-[11px] text-muted-foreground">PNG / JPG — decoded locally in your browser</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void handleFile(f)
                  e.target.value = ""
                }}
              />
            </label>
          )}

          {error && (
            <p className="mt-3 rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-600 ring-1 ring-red-500/20 dark:text-red-200" role="alert">
              {error}
            </p>
          )}
          <p className="mt-3 text-center text-[11px] text-muted-foreground">
            The QR is decoded locally — only the key you save is sent to your vault.
          </p>
        </div>
      </div>
    </div>
  )
}
