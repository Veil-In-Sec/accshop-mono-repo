"use client"

import * as React from "react"

export const DEFAULT_PAGE_SIZE = 10

/**
 * Shared client-side pagination — 10 items per page everywhere
 * (admin + customer order lists). Clamps back when the list shrinks.
 */
export function usePagination<T>(items: readonly T[], pageSize = DEFAULT_PAGE_SIZE) {
  const [page, setPage] = React.useState(1)
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
  const safePage = Math.min(Math.max(1, page), totalPages)

  React.useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const paged = items.slice((safePage - 1) * pageSize, safePage * pageSize)
  return { page: safePage, totalPages, total: items.length, paged, setPage, pageSize }
}
