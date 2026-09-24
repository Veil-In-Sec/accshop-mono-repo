import { requireAdmin } from "@/lib/server/admin";
import { exportBulkMailOrder } from "@/lib/server/bulkmail";
import { jsonError } from "@/lib/server/auth";
import { routeError } from "@/lib/server/upstream";

/** Returns supplier order file as JSON envelope (matches BulkMailOrderExport). */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(req);
    const { id: raw } = await params;
    const id = Number(raw);
    if (!Number.isInteger(id)) return jsonError(400, "Invalid BulkMail order id.");

    const formatRaw = new URL(req.url).searchParams.get("format") ?? "txt";
    const format = formatRaw === "csv" || formatRaw === "json" ? formatRaw : "txt";

    const { contentType, content } = await exportBulkMailOrder(id, format);
    const ext = format === "csv" ? "csv" : format === "json" ? "json" : "txt";
    return Response.json({
      content,
      contentType,
      filename: `bulkmail-order-${id}.${ext}`,
    });
  } catch (e) {
    return routeError(e);
  }
}
