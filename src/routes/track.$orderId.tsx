import { Link, createFileRoute } from "@tanstack/react-router";
import { ChefHat, CheckCircle2, CircleSlash, PackageCheck, ShoppingBag, Truck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatOrderDate } from "@/lib/orders";
import { isCancelled, statusFlow, statusIndex, statusLabel, type OrderStatus } from "@/lib/order-status";
import { useOrder } from "@/lib/use-order";

export const Route = createFileRoute("/track/$orderId")({
  head: () => ({
    meta: [
      { title: "Track Order — Flamio" },
      { name: "description", content: "Follow the progress of your Flamio order in real time." },
      { property: "og:title", content: "Track Order — Flamio" },
      { property: "og:description", content: "Follow the progress of your Flamio order." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TrackOrderPage,
});

const ICONS: Record<OrderStatus, typeof CheckCircle2> = {
  placed: ShoppingBag,
  confirmed: CheckCircle2,
  preparing: ChefHat,
  ready: PackageCheck,
  out_for_delivery: Truck,
  completed: CheckCircle2,
  cancelled: CircleSlash,
};

function TrackOrderPage() {
  const { orderId } = Route.useParams();
  const { order, ready } = useOrder(orderId);

  const fulfillment = order?.fulfillment ?? "delivery";
  const steps = statusFlow(fulfillment);
  const currentIndex = order ? statusIndex(order.status, fulfillment) : -1;
  const cancelled = order ? isCancelled(order.status) : false;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 pb-32 sm:px-6 sm:py-14">
      <h1 className="font-display text-3xl font-black sm:text-4xl">Track Order</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {order
          ? `Current status: ${statusLabel(order.status, fulfillment)}`
          : "Follow your order from the kitchen to your door."}
      </p>

      <section className="mt-6 rounded-2xl border border-border/70 bg-card p-5 shadow-card sm:p-6">
        {ready && order ? (
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="font-display text-lg font-extrabold text-gradient-ember">
              {order.code}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatOrderDate(order.createdAt)}
            </span>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {ready ? "We couldn't find this order." : "Loading order…"}
          </p>
        )}

        {cancelled ? (
          <p className="mt-5 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            This order was cancelled. Please contact us if you need help.
          </p>
        ) : (
          <ol className="mt-6 space-y-5">
            {steps.map((step, i) => {
              const done = currentIndex >= i && currentIndex >= 0;
              const isCurrent = currentIndex === i;
              const Icon = ICONS[step];
              return (
                <li key={step} className="flex items-start gap-3">
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border",
                      done
                        ? "border-primary bg-secondary text-primary"
                        : "border-border text-muted-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className={cn("text-sm font-semibold", !done && "text-muted-foreground")}>
                      {statusLabel(step, fulfillment)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {isCurrent ? "In progress now" : done ? "Done" : "Pending"}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        {order ? (
          <Button asChild size="lg" variant="outline" className="w-full sm:flex-1">
            <Link to="/order/$orderId" params={{ orderId: order.id }}>
              Order details
            </Link>
          </Button>
        ) : null}
        <Button asChild size="lg" className="w-full shadow-ember sm:flex-1">
          <Link to="/account/orders">My Orders</Link>
        </Button>
      </div>
    </div>
  );
}
