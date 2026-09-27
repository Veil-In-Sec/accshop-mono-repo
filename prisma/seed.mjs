// Seed default settings, features, FAQs and payment methods.
// Product catalog is managed from the admin panel (sourced from Hotmail143),
// so it is intentionally NOT seeded here.
// Run with: npm run db:seed
//
// No .env files are used — the database URL is a hardcoded literal in
// prisma/schema.prisma, which PrismaClient picks up automatically.
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const features = [
  { icon: "ShieldCheck", title: "Secure & Anonymous", description: "All accounts are created with privacy in mind. No personal information required.", sort_order: 0 },
  { icon: "Zap", title: "Instant Delivery", description: "Get your accounts immediately after purchase. No waiting time.", sort_order: 1 },
  { icon: "Headset", title: "24/7 Support", description: "Our team is always ready to help you with any questions or issues.", sort_order: 2 },
]

const faqs = [
  { question: "How quickly will I receive my account?", answer: "All accounts are delivered instantly after your payment has been confirmed. You'll receive the login credentials in your dashboard.", sort_order: 0 },
  { question: "Are these accounts genuine?", answer: "Yes, every account is created and verified by our team before being listed, so you always receive a fully functional, genuine account.", sort_order: 1 },
  { question: "What payment methods do you accept?", answer: "We accept a wide range of secure payment methods, including mobile banking and crypto. All available options are shown at checkout.", sort_order: 2 },
  { question: "What if my account stops working?", answer: "If an account stops working within the guarantee window, contact our 24/7 support team and we'll replace it or issue a refund.", sort_order: 3 },
]

const paymentMethods = [
  { name: "bKash", type: "mobile_banking", account_number: "01700000000", account_name: "AccShop", instructions: "Send money (not payment) to this bKash Personal number, then submit the transaction ID below.", icon: "Smartphone", enabled: true, sort_order: 0 },
  { name: "Nagad", type: "mobile_banking", account_number: "01700000001", account_name: "AccShop", instructions: "Send money to this Nagad Personal number, then submit the transaction ID below.", icon: "Smartphone", enabled: true, sort_order: 1 },
  { name: "Rocket", type: "mobile_banking", account_number: "01700000002", account_name: "AccShop", instructions: "Send money to this Rocket Personal number, then submit the transaction ID below.", icon: "Smartphone", enabled: true, sort_order: 2 },
  { name: "USDT (TRC20)", type: "crypto", account_number: "TXaccshopdemoaddress0000000000000", account_name: "AccShop", instructions: "Send USDT (TRC20 network only) to this wallet address, then submit the transaction hash below.", icon: "Wallet", enabled: true, sort_order: 3 },
]

async function main() {
  await prisma.$transaction(async (tx) => {
    await tx.siteSetting.upsert({
      where: { id: 1 },
      update: {},
      create: {
        id: 1,
        currencySymbol: "৳",
        usdToLocalRate: 1,
        minDepositUsd: 5,
        minTransferAmount: 1,
        initialBalance: 0,
        siteName: "AccShop",
        supportUrl: "https://t.me/accshop",
        heroTitle: "Premium Email Accounts, Delivered Instantly",
        heroSubtitle:
          "Secure, anonymous Hotmail, Outlook and Gmail accounts for your personal or business needs.",
        footerText: "Providing secure, anonymous email accounts since 2023.",
      },
    })

    for (const f of features) {
      await tx.feature.create({
        data: { icon: f.icon, title: f.title, description: f.description, sortOrder: f.sort_order },
      })
    }

    for (const f of faqs) {
      await tx.faq.create({
        data: { question: f.question, answer: f.answer, sortOrder: f.sort_order },
      })
    }

    for (const p of paymentMethods) {
      await tx.paymentMethod.create({
        data: {
          name: p.name,
          type: p.type,
          accountNumber: p.account_number,
          accountName: p.account_name,
          instructions: p.instructions,
          icon: p.icon,
          enabled: p.enabled,
          sortOrder: p.sort_order,
        },
      })
    }
  })

  console.log("[seed] Done (products are managed from the admin panel).")
}

main()
  .catch((err) => {
    console.error("[seed] Failed:", err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
