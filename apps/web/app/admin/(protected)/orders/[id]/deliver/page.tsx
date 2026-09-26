"use client"

import { useState } from "react"
import { ArrowLeft, Package, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"

import { deliverCustomProduct, rejectCustomProduct, getAdminOrder } from "@/app/actions/admin"
import { ClientDate } from "@/components/client-date"
import { formatMoney } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

type CredentialItem = {
  email: string
  password: string
  refresh_token?: string
  client_id?: string
}

export default function DeliverCustomProductPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const orderId = Number(id)

  const [credentialsText, setCredentialsText] = useState("")
  const [isDelivering, setIsDelivering] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [order, setOrder] = useState<{
    id: number
    userEmail: string
    productName: string
    price: number
    quantity: number
    status: string
    purchasedAt: string
    deliveredEmail: string
  } | null>(null)
  const [loading, setLoading] = useState(true)

  const parseCredentials = (text: string): CredentialItem[] => {
    const lines = text.trim().split("\n").filter(l => l.trim())
    return lines.map(line => {
      const parts = line.split("|").map(p => p.trim())
      return {
        email: parts[0] || "",
        password: parts[1] || "",
        refresh_token: parts[2] || "",
        client_id: parts[3] || "",
      }
    }).filter(c => c.email && c.password)
  }

  const fetchOrder = async () => {
    try {
      const found = await getAdminOrder(orderId)
      if (found) setOrder(found)
    } catch {
      // Ignore
    } finally {
      setLoading(false)
    }
  }

  // Fetch on mount
  if (loading) {
    fetchOrder()
  }

  const handleDeliver = async () => {
    if (!order) return

    const credentials = parseCredentials(credentialsText)

    if (credentials.length === 0) {
      toast.error("Enter at least one credential (email|password|refresh_token|client_id per line)")
      return
    }

    setIsDelivering(true)
    try {
      const result = await deliverCustomProduct(orderId, credentials)
      if (result.success) {
        toast.success(result.message)
        router.push(`/admin/orders/${orderId}`)
        router.refresh()
      } else {
        toast.error((result as { message?: string }).message ?? "Could not deliver custom product.")
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not deliver custom product.")
    } finally {
      setIsDelivering(false)
    }
  }

  const handleReject = async () => {
    if (!order) return

    if (!window.confirm(`Reject order #${orderId}? This will mark the order as failed and refund the customer's balance.`)) {
      return
    }

    setIsRejecting(true)
    try {
      const result = await rejectCustomProduct(orderId)
      if (result.success) {
        toast.success(result.message)
        router.push(`/admin/orders/${orderId}`)
        router.refresh()
      } else {
        toast.error((result as { message?: string }).message ?? "Could not reject custom product.")
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not reject custom product.")
    } finally {
      setIsRejecting(false)
    }
  }

  const handleBack = () => {
    router.push(`/admin/orders/${orderId}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading order...</p>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="size-12 text-red-400" />
        <p className="text-muted-foreground">Order not found</p>
        <Button onClick={handleBack} variant="outline">Back to Order</Button>
      </div>
    )
  }

  if (order.status === "completed" && order.deliveredEmail) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <CheckCircle2 className="size-12 text-emerald-400" />
        <h2 className="text-xl font-semibold">Already Delivered</h2>
        <p className="text-muted-foreground">This order has already been delivered.</p>
        <Link href={`/admin/orders/${orderId}`}>
          <Button>View Order</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href={`/admin/orders/${orderId}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to Order
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-semibold text-foreground">Deliver Custom Product</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Order #{order.id} — {order.productName} for {order.userEmail}
        </p>
      </div>

      {/* Order Summary */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg">Order Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-muted-foreground text-sm">Status</p>
            <p className="font-medium">{order.status}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-sm">Qty</p>
            <p className="font-medium">{order.quantity}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-sm">Price</p>
            <p className="font-medium">{formatMoney(order.price * order.quantity)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-sm">Purchased</p>
            <p className="font-medium"><ClientDate iso={order.purchasedAt} /></p>
          </div>
        </CardContent>
      </Card>

      {/* Delivery Form */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg">Credentials</CardTitle>
          <CardDescription className="mt-2">
            Enter one account per line using pipe-delimited format.
            <br />
            <code className="font-mono text-sm">email|password|refresh_token|client_id</code>
            <br />
            Only email and password are required. Use empty pipes for optional fields.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Label htmlFor="credentials" className="block text-sm font-medium">Credentials</Label>
          <Textarea
            id="credentials"
            value={credentialsText}
            onChange={(e) => setCredentialsText(e.target.value)}
            placeholder="user1@example.com|password1|refresh_token1|client_id1&#10;user2@example.com|password2||&#10;user3@example.com|password3|refresh_token3|"
            className="font-mono text-sm min-h-[300px] resize-y"
            rows={15}
          />

          <div className="p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground font-mono">
            <strong>Example:</strong>
            <div className="mt-1">user@example.com|pass123|refresh_token_abc|client_xyz</div>
            <div>user2@example.com|pass456||client_123</div>
            <div>user3@example.com|pass789|refresh_token_only|</div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={handleBack} disabled={isDelivering || isRejecting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={isDelivering || isRejecting} className="ml-auto">
              {isRejecting ? (
                <>
                  <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                  Rejecting...
                </>
              ) : (
                <>
                  <AlertCircle className="size-3.5 mr-1.5" />
                  Reject & Refund
                </>
              )}
            </Button>
            <Button onClick={handleDeliver} disabled={isDelivering || isRejecting} className="ml-auto">
              {isDelivering ? (
                <>
                  <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                  Delivering...
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-3.5 mr-1.5" />
                  Deliver Product
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}