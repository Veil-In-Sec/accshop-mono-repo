"use client"

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

export type RevenuePoint = { date: string; revenue: number; sales?: number; profit?: number; orders: number }

export function RevenueChart({ data }: { data: RevenuePoint[] }) {
  const normalized = data.map((point) => ({
    ...point,
    sales: point.sales ?? point.revenue ?? 0,
  }))
  const hasSales = normalized.some((point) => point.sales > 0)

  return (
    <div className="rounded-[20px] border border-white/[0.06] bg-zinc-900 p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-base font-semibold tracking-tight text-white">Sales — last 14 days</h2>
        <span className="text-xs text-zinc-500">
          {hasSales ? "Daily total sales (BDT)" : "No sales recorded yet"}
        </span>
      </div>
      <div className="mt-4 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={normalized} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#5362AC" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#5362AC" stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={(value: string) => value.slice(5)}
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={24}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value: number) => `BDT ${value}`}
              width={56}
            />
            <Tooltip
              cursor={{ stroke: "rgba(83,98,172,0.4)", strokeDasharray: "4 4" }}
              contentStyle={{
                backgroundColor: "#1a1d29",
                border: "1px solid rgba(148,163,184,0.2)",
                borderRadius: 10,
                fontSize: 12,
                color: "#e2e8f0",
              }}
              labelStyle={{ color: "#94a3b8", marginBottom: 4 }}
              formatter={(value, name) => {
                if (name === "sales") return [`BDT ${Number(value ?? 0).toFixed(2)}`, "Sales"]
                if (name === "revenue") return [`BDT ${Number(value ?? 0).toFixed(2)}`, "Sales"]
                return [String(value ?? 0), "Orders"]
              }}
            />
            <Area
              type="monotone"
              dataKey="sales"
              stroke="#5362AC"
              strokeWidth={2}
              fill="url(#revenueFill)"
              dot={false}
              activeDot={{ r: 4, fill: "#5362AC", strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
