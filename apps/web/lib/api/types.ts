// Shared DTOs — no runtime imports, safe for both client and server bundles.

export interface Settings {
  currencySymbol: string
  usdToLocalRate: number
  minDepositUsd: number
  minTransferAmount: number
  siteName: string
  supportUrl: string
  heroTitle?: string
  heroSubtitle?: string
  footerText?: string
  heroBadge?: string
  aboutTitle?: string
  aboutSubtitle?: string
  aboutHeading?: string
  aboutPara1?: string
  aboutPara2?: string
  stat1Value?: string
  stat1Label?: string
  stat2Value?: string
  stat2Label?: string
  stat3Value?: string
  stat3Label?: string
  stat4Value?: string
  stat4Label?: string
  trustTitle?: string
  trustDesc?: string
  trustBullets?: string
  valuesTitle?: string
  valuesSubtitle?: string
  featuresTitle?: string
  featuresSubtitle?: string
  teamTitle?: string
  teamDescription?: string
  teamStat1Value?: string
  teamStat1Label?: string
  teamStat2Value?: string
  teamStat2Label?: string
  teamImageUrl?: string
  testimonialsTitle?: string
  testimonialsSubtitle?: string
  faqTitle?: string
  ctaBadge?: string
  ctaTitle?: string
  ctaSubtitle?: string
  contactPhone?: string
  contactSupportEmail?: string
  contactSalesEmail?: string
}

export interface PaymentMethod {
  id: number
  name: string
  type: string
  accountNumber: string
  accountName: string
  instructions: string
  icon: string
  enabled?: boolean
  sortOrder?: number
}

export interface Feature {
  id: number
  icon: string
  title: string
  description: string
  sortOrder: number
}

export interface Faq {
  id: number
  question: string
  answer: string
  sortOrder: number
}

export interface Testimonial {
  id: number
  stars: number
  tag: string
  quote: string
  name: string
  role: string
  avatar: string
  sortOrder: number
}

export interface WalletData {
  balance: number;
  orders: Array<{
    id: string
    productName: string
    tag?: string
    price: number
    quantity?: number
    deliveredEmail: string
    deliveredPassword: string
    deliveredRefreshToken?: string
    deliveredClientId?: string
    deliveredCredentials?: string
    status?: "pending" | "processing" | "completed" | "failed"
    purchasedAt: string
  }>
  transactions: Array<{
    id: string
    type: "deposit" | "purchase" | "refund" | "referral" | "transfer"
    description: string
    amount: number
    balanceAfter: number
    status: "completed" | "pending"
    createdAt: string
  }>
}

export type ActionResult = { success: boolean; message?: string }

export interface HotmailProductOption {
  productType: string
  accountType: string
  name: string
  stock: number
}

export interface BulkMailProductOption {
  productId: number
  name: string
  sku: string
  stock: number
  price: number
}

export interface FxRateInfo {
  rate: number
  source: string
  liveEnabled: boolean
  currency: string
  fetchedAt: string | null
  manualRate: number
}

export interface BulkMailTierInfo {
  min_quantity: number
  price: number
  priceBdt?: number
}

export interface BulkMailCatalogItem {
  productId: number
  name: string
  sku: string
  description: string
  price: number
  basePrice: number
  priceBdt: number
  basePriceBdt: number
  stock: number
  inStock: boolean
  bulkPricingEnabled: boolean
  bulkTiers: BulkMailTierInfo[]
}

export interface BulkMailCatalogPage {
  items: BulkMailCatalogItem[]
  meta: {
    current_page: number
    per_page: number
    total: number
    total_pages: number
  }
  currency: string
  rate: number
  rateSource: string
}

export interface BulkMailCatalogDetails {
  product: BulkMailCatalogItem
  tiers: BulkMailTierInfo[]
  previews: Array<{
    quantity: number
    unitPrice: number
    totalPrice: number
    unitPriceBdt: number
    totalPriceBdt: number
    discountApplied: boolean
    savings: number
    savingsBdt: number
  }>
  currency: string
  rate: number
  rateSource: string
}

export interface BulkMailSupplierOrder {
  id: number
  orderNumber: string
  productName: string
  quantity: number
  unitPrice: number
  totalAmount: number
  unitPriceBdt: number
  totalAmountBdt: number
  status: string
  createdAt: string
  stockItems: string[]
  currency: string
}

export interface BulkMailSupplierOrderList {
  items: Array<Omit<BulkMailSupplierOrder, "stockItems" | "currency"> & { stockItems?: string[] }>
  meta: {
    current_page: number
    per_page: number
    total: number
    total_pages: number
  }
  currency: string
  rate: number
  rateSource: string
}

export interface BulkMailOrderExport {
  content: string
  contentType: string
  filename: string
}

export interface AdminOverview {
  userCount: number
  orderCount: number
  totalRevenue: number
  totalProfit?: number
  totalCustomerAmount: number
  totalSales?: number
  totalHotmailCost: number
  presentHotmailBalance: number | null
  previousHotmailBalance: number | null
  presentBulkmailBalance?: number | null
  presentBulkmailBalanceUsd?: number | null
  bulkmailRate?: number | null
  bulkmailRateSource?: string
  bulkmailCurrency?: string
  revenueToday: number
  revenueWeek: number
  revenueMonth: number
  revenueYear: number
  salesToday?: number
  salesWeek?: number
  salesMonth?: number
  salesYear?: number
  profitToday?: number
  profitWeek?: number
  profitMonth?: number
  profitYear?: number
  pendingDeposits: number
  totalWalletLiability: number
  revenueByDay: Array<{ date: string; revenue: number; sales?: number; profit?: number; orders: number }>
}

export interface AdminProduct {
  id: number
  slug: string
  name: string
  category: string
  section: string
  price: number
  originalPrice: number | null
  stock: number
  tag: string
  badge: string
  active: boolean
  featured: boolean
  externalProductType: string
  externalAccountType: string
  supplier?: string
  bulkmailProductId?: number | null
}

export interface AdminUser {
  id: string
  name: string
  email: string
  balance: number
  createdAt: string
}

export interface AdminUserDetails {
  user: {
    id: string
    name: string
    email: string
    emailVerified: boolean
    image: string | null
    createdAt: string
    updatedAt: string
  }
  wallet: {
    balance: number
    referralCode: string | null
    referredBy: string | null
    updatedAt: string | null
  }
  stats: {
    totalOrders: number
    completedOrders: number
    totalSpent: number
    totalDeposited: number
    totalTransactions: number
    pendingDeposits: number
    unreadSupport: number
    unreadNotifications: number
    activeSessions: number
    totpKeys: number
  }
  orders: Array<{
    id: number
    productName: string
    price: number
    quantity: number
    total: number
    status: string
    supplier: string
    externalOrderId: string
    purchasedAt: string
  }>
  transactions: Array<{
    id: number
    type: string
    description: string
    amount: number
    balanceAfter: number
    status: string
    createdAt: string
  }>
  deposits: Array<{
    id: number
    amount: number
    currency: string
    paymentMethodId: number | null
    senderAccountNumber: string
    transactionReference: string
    status: string
    adminNote: string
    createdAt: string
    reviewedAt: string | null
  }>
  support: {
    total: number
    unread: number
    lastText: string
    lastSender: string
    lastAt: string | null
    recent: Array<{
      id: number
      sender: string
      text: string
      read: boolean
      createdAt: string
    }>
  }
  sessions: Array<{
    id: string
    ipAddress: string
    userAgent: string
    createdAt: string
    expiresAt: string
    active: boolean
  }>
}

export interface AdminOrder {
  id: number
  userEmail: string
  productName: string
  price: number
  quantity: number
  status: string
  supplier?: string
  externalOrderId?: string
  purchasedAt: string
  deliveredEmail: string
  deliveredPassword: string
  deliveredRefreshToken: string
  deliveredClientId: string
  deliveredCredentials: string
}

export interface AdminSettings {
  currencySymbol: string
  usdToLocalRate: number
  minDepositUsd: number
  minTransferAmount: number
  initialBalance: number
  siteName: string
  supportUrl: string
  heroTitle: string
  heroSubtitle: string
  footerText: string
  hotmailApiKey: string
  hotmailApiBaseUrl: string
  bulkmailApiKey?: string
  bulkmailApiBaseUrl?: string
  fxLiveEnabled?: boolean
  heroBadge: string
  aboutTitle: string
  aboutSubtitle: string
  aboutHeading: string
  aboutPara1: string
  aboutPara2: string
  stat1Value: string
  stat1Label: string
  stat2Value: string
  stat2Label: string
  stat3Value: string
  stat3Label: string
  stat4Value: string
  stat4Label: string
  trustTitle: string
  trustDesc: string
  trustBullets: string
  valuesTitle: string
  valuesSubtitle: string
  featuresTitle: string
  featuresSubtitle: string
  teamTitle: string
  teamDescription: string
  teamStat1Value: string
  teamStat1Label: string
  teamStat2Value: string
  teamStat2Label: string
  teamImageUrl: string
  testimonialsTitle: string
  testimonialsSubtitle: string
  faqTitle: string
  ctaBadge: string
  ctaTitle: string
  ctaSubtitle: string
  contactPhone: string
  contactSupportEmail: string
  contactSalesEmail: string
}

export interface AdminPaymentMethod {
  id: number
  name: string
  type: string
  accountNumber: string
  accountName: string
  instructions: string
  icon: string
  enabled: boolean
  sortOrder: number
}

export interface AdminCategory {
  id: number
  name: string
  active: boolean
  isCustom: boolean
}

export interface AdminActivityEvent {
  kind: string
  userEmail: string
  amount: number
  pending: boolean
  createdAt: string
}

export interface SupportMessage {
  id: number
  userId: string
  sender: "customer" | "admin" | string
  text: string
  read: boolean
  createdAt: string
}

export interface SupportConversation {
  userId: string
  userEmail: string
  userName: string
  lastText: string
  lastSender: string
  lastAt: string
  unread: number
  total: number
}

export interface SupportThread {
  userId: string
  userEmail: string
  userName: string
  messages: SupportMessage[]
}

export interface NotificationItem {
  id: number
  userId: string
  type: string
  title: string
  body: string
  read: boolean
  createdAt: string
}

export interface DepositRequest {
  id: number
  amount: number
  currency?: string
  status: string
  paymentMethodId?: number | null
  paymentMethod?: string
  senderAccountNumber?: string
  transactionReference: string
  adminNote?: string
  createdAt: string
  [key: string]: unknown
}

export interface AdminDepositRequest {
  id: number
  userId: string
  userEmail: string
  paymentMethodId: number | null
  paymentMethod: string
  amount: number
  currency: string
  senderAccountNumber: string
  transactionReference: string
  status: string
  adminNote: string
  createdAt: string
  reviewedAt: string | null
}

export interface PurchaseOrder {
  id: string
  productName: string
  tag?: string
  price: number
  deliveredEmail: string
  deliveredPassword: string
  status?: string
  purchasedAt: string
}

export interface PurchaseResult {
  success: true
  message: string
  order: PurchaseOrder
}

export interface OwnedEmail {
  email: string
  orderId: number
  productName: string
}

export interface GmailCodeResponse {
  successful: boolean
  code: number
  msg: string
  timestamp?: number
  data: { code: string | null; full_content?: string } | null
}

export interface HotmailCodeResponse {
  successful: boolean
  code: number
  msg: string
  timestamp?: number
  data: {
    code: string | null
    messages?: unknown[]
    email?: string
    retryAfter?: number
    shouldRetry?: boolean
  } | null
}

/**
 * Discriminated envelope returned by POST /verification-codes/hotmail.
 * `hotmail` = looked up via Hotmail143 `hotmail-code` (full 4-part line),
 * `outlook` = looked up via Hotmail143 `outlook-code` (email-only line).
 */
export type HotmailLookupResponse =
  | { kind: "hotmail"; result: HotmailCodeResponse }
  | { kind: "outlook"; result: OutlookCodeResponse }

export interface OutlookCodeResponse {
  successful: boolean
  code: number
  msg: string
  timestamp?: number
  data: {
    code: string | null
    email?: string
    address?: string
    expires_at?: string
    mail?: {
      sender_name?: string
      sender_email?: string
      subject?: string
      body_text?: string
      received_at?: number
      site?: string
    } | null
    retryAfter?: number
    shouldRetry?: boolean
    reordered?: boolean
    new_email?: string | null
    needs_topup?: boolean
  } | null
  history?: Array<{ code: string; created_at: string }>
}

export interface TotpKeyMeta {
  id: number
  label: string
  issuer: string
  algorithm: string
  digits: number
  period: number
  createdAt: string
}

export interface TotpLiveCode {
  id: number
  code: string
  secondsRemaining: number
  period: number
  digits: number
}

export interface TotpCreateInput {
  label?: string
  issuer?: string
  secret: string
  algorithm?: "SHA1" | "SHA256" | "SHA512"
  digits?: number
  period?: number
}

export interface TotpCreateResult extends TotpKeyMeta {
  preview: { code: string; secondsRemaining: number }
}
