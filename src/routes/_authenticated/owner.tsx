import { Link, Outlet, createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { Skeleton } from "@/components/ui/skeleton";
import { claimOwnership, getOwnerAccess } from "@/lib/owner.functions";
import { cn } from "@/lib/utils";

/**
 * Owner area shell. The real access boundary lives in the server functions
 * (every owner endpoint re-checks the caller's role); this gate is UX only.
 */
export const Route = createFileRoute("/_authenticated/owner")({
  head: () => ({
    meta: [
      { title: "Owner Dashboard — Flamio" },
      { name: "description", content: "Manage Flamio orders, menu and restaurant settings." },
      { property: "og:title", content: "Owner Dashboard — Flamio" },
      { property: "og:description", content: "Manage Flamio orders, menu and restaurant settings." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OwnerLayout,
});

const TABS = [
  { to: "/owner", label: "Home", exact: true },
  { to: "/owner/orders", label: "Orders", exact: false },
  { to: "/owner/menu", label: "Menu", exact: false },
  { to: "/owner/settings", label: "Settings", exact: false },
] as const;

function OwnerLayout() {
  const fetchAccess = useServerFn(getOwnerAccess);
  const claim = useServerFn(claimOwnership);
  const queryClient = useQueryClient();
  const [claiming, setClaiming] = useState(false);

  const access = useQuery({
    queryKey: ["owner-access"],
    queryFn: () => fetchAccess(),
    staleTime: 60 * 1000,
  });

  if (access.isLoading) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-4 px-4 py-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (access.error) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-8">
        <EmptyState
          title="Couldn't check your access"
          description="Something went wrong while verifying your owner access."
          action={<Button onClick={() => void access.refetch()}>Try again</Button>}
        />
      </div>
    );
  }

  if (!access.data?.isOwner) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-8">
        <EmptyState
          title="Owner access required"
          description={
            access.data?.canClaim
              ? "No owner has been set up yet. Claim owner access for this account to manage Flamio."
              : "This account doesn't have owner permissions. Ask the restaurant owner to grant access."
          }
          action={
            access.data?.canClaim ? (
              <Button
                disabled={claiming}
                onClick={async () => {
                  setClaiming(true);
                  try {
                    await claim({});
                    await queryClient.invalidateQueries({ queryKey: ["owner-access"] });
                    toast.success("Owner access enabled");
                  } catch (error) {
                    toast.error(
                      error instanceof Error ? error.message : "Couldn't enable owner access",
                    );
                  } finally {
                    setClaiming(false);
                  }
                }}
              >
                {claiming ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Claim owner access
              </Button>
            ) : (
              <Button asChild variant="outline">
                <Link to="/">Back to Flamio</Link>
              </Button>
            )
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <header className="mb-5">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <ShieldCheck className="h-4 w-4" /> Owner
        </p>
        <h1 className="font-display text-2xl font-bold">Dashboard</h1>
      </header>

      <nav className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {TABS.map((tab) => (
          <Link
            key={tab.to}
            to={tab.to}
            activeOptions={{ exact: tab.exact }}
            className={cn(
              "whitespace-nowrap rounded-full border border-border px-4 py-2 text-sm font-medium transition-colors",
              "hover:bg-muted",
            )}
            activeProps={{ className: "bg-primary text-primary-foreground border-primary" }}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      <Outlet />
    </div>
  );
}
