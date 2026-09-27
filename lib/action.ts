// Shared server-action wrapper: removes ~30x copy-pasted
// try { ok:true } catch { ok:false,message } blocks in app/actions/*.
export type Ok<T> = { ok: true } & T
export type Fail = { ok: false; message: string }
export type ActionOutcome<T> = Ok<T> | Fail

export async function withAction<T>(
  fn: () => Promise<T>,
  fallbackMessage: string,
): Promise<T | Fail> {
  try {
    return await fn()
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : fallbackMessage } as Fail
  }
}

/** Wraps a fetcher returning data into the { ok:true, ...data } envelope. */
export async function withOk<T extends Record<string, unknown> | unknown>(
  fn: () => Promise<T>,
  fallbackMessage: string,
): Promise<{ ok: true; data: T } | Fail> {
  try {
    return { ok: true, data: await fn() } as { ok: true; data: T }
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : fallbackMessage }
  }
}

export function fail(message: string): Fail {
  return { ok: false, message }
}

export function isFail<T>(res: T | Fail): res is Fail {
  return !!res && typeof res === "object" && "ok" in res && (res as Fail).ok === false
}
