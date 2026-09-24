import { serverFetch, serverFetchResponse, forwardSetCookies, publicFetch } from "./server"
import type {
  Settings,
  PaymentMethod,
  Feature,
  Faq,
  Testimonial,
  WalletData,
  Order,
  ActionResult,
  HotmailProductOption,
  BulkMailProductOption,
  BulkMailCatalogPage,
  BulkMailCatalogDetails,
  BulkMailSupplierOrder,
  BulkMailSupplierOrderList,
  BulkMailOrderExport,
  FxRateInfo,
  AdminOverview,
  AdminProduct,
  AdminUser,
  AdminUserDetails,
  AdminOrder,
  AdminSettings,
  AdminPaymentMethod,
  AdminCategory,
  AdminActivityEvent,
  SupportMessage,
  SupportConversation,
  SupportThread,
  NotificationItem,
  DepositRequest,
  AdminDepositRequest,
  PurchaseOrder,
  PurchaseResult,
  OwnedEmail,
  GmailCodeResponse,
  GraphCodeResponse,
  GraphMailMessage,
  HotmailCodeResponse,
  HotmailLookupResponse,
  OutlookCodeResponse,
  TotpKeyMeta,
  TotpLiveCode,
  TotpCreateInput,
  TotpCreateResult,
} from "./types"

export type {
  Settings,
  PaymentMethod,
  Feature,
  Faq,
  Testimonial,
  WalletData,
  Order,
  ActionResult,
  HotmailProductOption,
  BulkMailProductOption,
  BulkMailCatalogPage,
  BulkMailCatalogDetails,
  BulkMailSupplierOrder,
  BulkMailSupplierOrderList,
  BulkMailOrderExport,
  FxRateInfo,
  AdminOverview,
  AdminProduct,
  AdminUser,
  AdminUserDetails,
  AdminOrder,
  AdminSettings,
  AdminPaymentMethod,
  AdminCategory,
  AdminActivityEvent,
  SupportMessage,
  SupportConversation,
  SupportThread,
  NotificationItem,
  DepositRequest,
  AdminDepositRequest,
  PurchaseOrder,
  PurchaseResult,
  OwnedEmail,
  GmailCodeResponse,
  GraphCodeResponse,
  GraphMailMessage,
  HotmailCodeResponse,
  HotmailLookupResponse,
  OutlookCodeResponse,
  TotpKeyMeta,
  TotpLiveCode,
  TotpCreateInput,
  TotpCreateResult,
} from "./types"

const json = (body: unknown) => ({ body: JSON.stringify(body) })

export const serverApi = {
  settings: {
    getPublic: () => publicFetch<Settings>("/settings"),
  },
  catalog: {
    categories: () => publicFetch<string[]>("/catalog/categories"),
    products: () =>
      publicFetch<Array<{
        id: number
        slug: string
        name: string
        category: string
        price: number
        originalPrice: number | null
        stock: number
        badge?: string
      }>>("/catalog/products"),
  },
  payments: {
    methodsEnabled: () => publicFetch<PaymentMethod[]>("/payments/methods"),
    methodsAll: () => serverFetch<AdminPaymentMethod[]>("/admin/payment-methods"),
    upsert: (input: unknown) =>
      serverFetch<ActionResult>("/admin/payment-methods", { method: "POST", ...json(input) }),
    remove: (id: number) =>
      serverFetch<ActionResult>(`/admin/payment-methods/${id}`, { method: "DELETE" }),
  },
  content: {
    features: () => serverFetch<Feature[]>("/admin/content/features"),
    faqs: () => serverFetch<Faq[]>("/admin/content/faqs"),
    testimonials: () => serverFetch<Testimonial[]>("/admin/content/testimonials"),
    landingFeatures: () => publicFetch<Feature[]>("/content/features"),
    landingFaqs: () => publicFetch<Faq[]>("/content/faqs"),
    landingTestimonials: () => publicFetch<Testimonial[]>("/content/testimonials"),
    upsertFeature: (input: unknown) =>
      serverFetch<ActionResult>("/admin/content/features", { method: "POST", ...json(input) }),
    deleteFeature: (id: number) =>
      serverFetch<ActionResult>(`/admin/content/features/${id}`, { method: "DELETE" }),
    moveFeature: (id: number, direction: "up" | "down") =>
      serverFetch<ActionResult>(`/admin/content/features/${id}/move`, {
        method: "POST",
        ...json({ direction }),
      }),
    upsertFaq: (input: unknown) =>
      serverFetch<ActionResult>("/admin/content/faqs", { method: "POST", ...json(input) }),
    deleteFaq: (id: number) =>
      serverFetch<ActionResult>(`/admin/content/faqs/${id}`, { method: "DELETE" }),
    moveFaq: (id: number, direction: "up" | "down") =>
      serverFetch<ActionResult>(`/admin/content/faqs/${id}/move`, {
        method: "POST",
        ...json({ direction }),
      }),
    upsertTestimonial: (input: unknown) =>
      serverFetch<ActionResult>("/admin/content/testimonials", { method: "POST", ...json(input) }),
    deleteTestimonial: (id: number) =>
      serverFetch<ActionResult>(`/admin/content/testimonials/${id}`, { method: "DELETE" }),
    moveTestimonial: (id: number, direction: "up" | "down") =>
      serverFetch<ActionResult>(`/admin/content/testimonials/${id}/move`, {
        method: "POST",
        ...json({ direction }),
      }),
  },
  wallet: {
    get: () => serverFetch("/wallet"),
    getData: () => serverFetch<WalletData>("/wallet/data"),
    init: () => serverFetch<ActionResult>("/wallet/init", { method: "POST" }),
    transfer: (recipientEmail: string, amount: number) =>
      serverFetch<ActionResult>("/wallet/transfer", {
        method: "POST",
        ...json({ recipientEmail, amount }),
      }),
    purchase: (input: {
      productId: number
      quantity?: number
      paymentMethodId?: number
      transactionReference?: string
      senderAccountNumber?: string
    }) =>
      serverFetch<PurchaseResult & { balance?: number; total?: number }>("/wallet/purchase", {
        method: "POST",
        ...json(input),
      }),
  },
  deposits: {
    submit: (input: unknown) =>
      serverFetch<ActionResult>("/deposits", { method: "POST", ...json(input) }),
    mine: () => serverFetch<DepositRequest[]>("/deposits/mine"),
  },
  support: {
    messages: () => serverFetch<SupportMessage[]>("/support/messages"),
    unreadCount: () => serverFetch<{ unread: number }>("/support/unread-count"),
    send: (text: string) =>
      serverFetch<{ success: boolean; message: SupportMessage }>("/support/messages", {
        method: "POST",
        ...json({ text }),
      }),
  },
  notifications: {
    list: () => serverFetch<NotificationItem[]>("/notifications"),
    unreadCount: () => serverFetch<{ unread: number }>("/notifications/unread-count"),
    markRead: (id: number) =>
      serverFetch<ActionResult>(`/notifications/${id}/read`, { method: "POST" }),
    markAllRead: () => serverFetch<ActionResult>("/notifications/read-all", { method: "POST" }),
  },
  verificationCodes: {
    emails: () => serverFetch<OwnedEmail[]>("/verification-codes/emails"),
    gmail: (email: string) =>
      serverFetch<GmailCodeResponse>(
        `/verification-codes/gmail?email=${encodeURIComponent(email)}`,
      ),
    outlook: (email: string) =>
      serverFetch<GraphCodeResponse>(
        `/verification-codes/outlook?email=${encodeURIComponent(email)}`,
      ),
    hotmail: (data: string) =>
      serverFetch<HotmailLookupResponse>("/verification-codes/hotmail", {
        method: "POST",
        ...json({ data }),
      }),
  },
  totp: {
    keys: () => serverFetch<TotpKeyMeta[]>("/totp/keys"),
    codes: () => serverFetch<TotpLiveCode[]>("/totp/codes"),
    create: (input: TotpCreateInput) =>
      serverFetch<TotpCreateResult>("/totp/keys", { method: "POST", ...json(input) }),
    rename: (id: number, input: { label?: string; issuer?: string }) =>
      serverFetch<TotpKeyMeta>(`/totp/keys/${id}`, { method: "PATCH", ...json(input) }),
    remove: (id: number) =>
      serverFetch<ActionResult>(`/totp/keys/${id}`, { method: "DELETE" }),
  },
  admin: {
    login: async (password: string) => {
      const res = await serverFetchResponse("/admin/auth/login", {
        method: "POST",
        body: JSON.stringify({ password }),
      })
      await forwardSetCookies(res)
      if (!res.ok) {
        let message = "Incorrect password."
        try {
          const body = await res.json()
          message = (body as { message?: string })?.message ?? message
        } catch {
          /* ignore */
        }
        return { success: false, message }
      }
      return { success: true, message: "Signed in." }
    },
    logout: async () => {
      const res = await serverFetchResponse("/admin/auth/logout", { method: "POST" })
      await forwardSetCookies(res)
      return { success: true, message: "Signed out." }
    },
    overview: () => serverFetch<AdminOverview>("/admin/overview"),
    products: (section?: string) =>
      serverFetch<AdminProduct[]>(
        `/admin/products${section ? `?section=${encodeURIComponent(section)}` : ""}`,
      ),
    upsertProduct: (input: unknown) =>
      serverFetch<ActionResult>("/admin/products", { method: "POST", ...json(input) }),
    deleteProduct: (id: number) =>
      serverFetch<ActionResult>(`/admin/products/${id}`, { method: "DELETE" }),
    settings: () => serverFetch<AdminSettings | null>("/admin/settings"),
    updateSettings: (input: unknown) =>
      serverFetch<ActionResult>("/admin/settings", { method: "PUT", ...json(input) }),
    users: () => serverFetch<AdminUser[]>("/admin/users"),
    userDetails: (userId: string) =>
      serverFetch<AdminUserDetails>(`/admin/users/${encodeURIComponent(userId)}`),
    adjustBalance: (userId: string, amount: number, note?: string) =>
      serverFetch<ActionResult>(`/admin/users/${userId}/balance`, {
        method: "POST",
        ...json({ amount, note }),
      }),
    deleteUser: (userId: string) =>
      serverFetch<ActionResult>(`/admin/users/${encodeURIComponent(userId)}`, {
        method: "DELETE",
      }),
    orders: () => serverFetch<AdminOrder[]>("/admin/orders"),
    ordersAttentionCount: () => serverFetch<{ count: number }>("/admin/orders/attention-count"),
    deposits: {
      list: (status?: string) =>
        serverFetch<AdminDepositRequest[]>(
          `/admin/deposits${status ? `?status=${encodeURIComponent(status)}` : ""}`,
        ),
      pendingCount: () =>
        serverFetch<{ count: number }>("/admin/deposits?status=pending").then(
          (rows) => ({ count: Array.isArray(rows) ? rows.length : 0 }),
        ),
      review: (id: number, decision: "approved" | "rejected", note?: string) =>
        serverFetch<ActionResult>(`/admin/deposits/${id}/review`, {
          method: "POST",
          ...json({ decision, note }),
        }),
    },
    hotmail143: {
      config: (input: { apiKey?: string; baseUrl?: string }) =>
        serverFetch<ActionResult>("/admin/hotmail143/config", { method: "POST", ...json(input) }),
      balance: () => serverFetch<{ balance: number; email?: string }>("/admin/hotmail143/balance"),
      stock: () => serverFetch<{ data: Record<string, unknown> }>("/admin/hotmail143/stock"),
      products: () => serverFetch<HotmailProductOption[]>("/admin/hotmail143/products"),
    },
    bulkmail: {
      config: (input: { apiKey?: string; baseUrl?: string }) =>
        serverFetch<ActionResult>("/admin/bulkmail/config", { method: "POST", ...json(input) }),
      balance: () =>
        serverFetch<{
          balance: number
          balanceUsd?: number
          email?: string
          currency?: string
          rate?: number
          rateSource?: string
          fetchedAt?: string | null
        }>(
          "/admin/bulkmail/balance",
        ),
      stock: () => serverFetch<unknown>("/admin/bulkmail/stock"),
      products: () => serverFetch<BulkMailProductOption[]>("/admin/bulkmail/products"),
      catalog: (params?: {
        page?: number
        perPage?: number
        search?: string
        inStock?: boolean
        sort?: string
        order?: string
      }) => {
        const qs = new URLSearchParams()
        if (params?.page) qs.set("page", String(params.page))
        if (params?.perPage) qs.set("perPage", String(params.perPage))
        if (params?.search?.trim()) qs.set("search", params.search.trim())
        if (params?.inStock !== undefined) qs.set("inStock", params.inStock ? "true" : "false")
        if (params?.sort) qs.set("sort", params.sort)
        if (params?.order) qs.set("order", params.order)
        const suffix = qs.toString() ? `?${qs.toString()}` : ""
        return serverFetch<BulkMailCatalogPage>(`/admin/bulkmail/catalog${suffix}`)
      },
      catalogProduct: (id: number) =>
        serverFetch<BulkMailCatalogDetails>(`/admin/bulkmail/catalog/${id}`),
      orders: {
        list: (params?: { page?: number; perPage?: number; status?: string }) => {
          const qs = new URLSearchParams()
          if (params?.page) qs.set("page", String(params.page))
          if (params?.perPage) qs.set("perPage", String(params.perPage))
          if (params?.status) qs.set("status", params.status)
          const suffix = qs.toString() ? `?${qs.toString()}` : ""
          return serverFetch<BulkMailSupplierOrderList>(`/admin/bulkmail/orders${suffix}`)
        },
        get: (id: number) => serverFetch<BulkMailSupplierOrder>(`/admin/bulkmail/orders/${id}`),
        cancel: (id: number) =>
          serverFetch<ActionResult & { refundedAmount?: number; refundedAmountBdt?: number; currency?: string }>(
            `/admin/bulkmail/orders/${id}/cancel`,
            { method: "POST" },
          ),
        export: (id: number, format: "txt" | "csv" | "json" = "txt") =>
          serverFetch<BulkMailOrderExport>(
            `/admin/bulkmail/orders/${id}/export?format=${format}`,
          ),
      },
    },
    fx: {
      rate: () => serverFetch<FxRateInfo>("/admin/fx/rate"),
      mode: (live: boolean) =>
        serverFetch<ActionResult>("/admin/fx/mode", { method: "POST", ...json({ live }) }),
    },
    activity: (limit?: number) =>
      serverFetch<AdminActivityEvent[]>(`/admin/activity${limit ? `?limit=${limit}` : ""}`),
    support: {
      conversations: () => serverFetch<SupportConversation[]>("/admin/support/conversations"),
      unreadCount: () => serverFetch<{ unread: number }>("/admin/support/unread-count"),
      thread: (userId: string) =>
        serverFetch<SupportThread>(`/admin/support/messages?userId=${encodeURIComponent(userId)}`),
      reply: (userId: string, text: string) =>
        serverFetch<{ success: boolean; message: SupportMessage }>("/admin/support/messages", {
          method: "POST",
          ...json({ userId, text }),
        }),
    },
    categories: {
      list: () => serverFetch<AdminCategory[]>("/admin/categories"),
      create: (name: string) =>
        serverFetch<{ success: boolean; category: AdminCategory }>("/admin/categories", {
          method: "POST",
          ...json({ name }),
        }),
      update: (id: number, input: { name?: string; active?: boolean }) =>
        serverFetch<{ success: boolean; category: AdminCategory }>(`/admin/categories/${id}`, {
          method: "PUT",
          ...json(input),
        }),
      delete: (id: number) =>
        serverFetch<ActionResult>(`/admin/categories/${id}`, { method: "DELETE" }),
    },
  },
}
