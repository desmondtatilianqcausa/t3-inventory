"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api, api as convexApi } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import mondaySdk from "monday-sdk-js";
import { Button } from "src/app/_components/ui/button";

import { Spinner } from "~/app/_components/ui/loading-spinner";
import { DataTable } from "../../_components/Table";
import { toast } from "../../_components/ui/use-toast";
import { deleteOrder, duplicateOrder } from "./actions";
import { createColumns } from "./columns";

const monday = mondaySdk();

// eslint-disable-next-line @typescript-eslint/ban-types
type Props = {};

export default function OrderPage({}: Props) {
  const orders = useQuery(api.orders.queries.getAll, {});
  const ordersLoading = orders === undefined;
  const events = useQuery(api.events.queries.getAll, { limit: 100 }) ?? [];
  const eventsLoading = events === undefined;

  const eventNames: Record<string, string> = Object.fromEntries(
    events.map((e) => [String(e._id), String(e.title)]),
  );
  const columns = createColumns(eventNames);

  const router = useRouter();
  const createOrder = useMutation(api.orders.mutations.create);
  const bulkDelete = useMutation(api.orders.mutations.bulkDelete);
  console.log("orders", orders);

  useEffect(() => {
    // Fetch current user info
    monday
      .api(`query { me { id name email } }`)
      .then((res) => {
        console.log("User Info", res);
      })
      .catch((err) => {
        console.error("Error fetching user email:", err);
      });
  }, []);

  // Status filters
  const [statusFilter, setStatusFilter] = useState<Set<string>>(
    () => new Set(["Draft", "Check-Out"]),
  );
  const toggleStatus = (s: string) => {
    setStatusFilter((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  };
  const filteredOrders = useMemo(() => {
    if (!orders) return orders;
    if (statusFilter.size === 0) return orders;
    return orders.filter((o) => statusFilter.has(String(o.status ?? "")));
  }, [orders, statusFilter]);

  const statusFilterControls = (
    <>
      <Button
        type="button"
        variant={statusFilter.has("Draft") ? "secondary" : "outline"}
        onClick={() => toggleStatus("Draft")}
      >
        Draft
      </Button>
      <Button
        type="button"
        variant={statusFilter.has("Check-Out") ? "secondary" : "outline"}
        onClick={() => toggleStatus("Check-Out")}
      >
        Check-Out
      </Button>
      <Button
        type="button"
        variant={statusFilter.has("Check-In") ? "secondary" : "outline"}
        onClick={() => toggleStatus("Check-In")}
      >
        Check-In
      </Button>
    </>
  );

  // Removed header Save action from list page; it now appears on order detail page.
  // const [data, setData] = useState<orderType>([]);
  // const [loading, setLoading] = useState(true);

  async function handleDelete(id: number) {
    console.log(`Deleting item with id: ${id}`);
    // Implement your delete logic here
    const result = deleteOrder(id);
    console.log("handleDelete", result);

    toast({
      title: "Successfully Submitted:",
      description: (
        <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
          Successfully Deleted:
          <code className="text-white">{JSON.stringify(id, null, 2)}</code>
        </pre>
      ),
    });
  }

  async function handleDuplicate(id: number) {
    try {
      console.log(`Duplicating order with id: ${id}`);
      const result = await duplicateOrder(id);
      console.log("Duplicate order result:", result);

      if (result.success && result.data) {
        console.log("Storing duplicate data in session storage:", result.data);
        // Store the duplicate data in session storage on the client side
        sessionStorage.setItem(
          "duplicateOrderData",
          JSON.stringify(result.data),
        );

        // Verify it was stored
        const storedData = sessionStorage.getItem("duplicateOrderData");
        console.log(
          "Verified stored data:",
          storedData ? "present" : "missing",
        );

        // Redirect to checkout page
        router.push("/order/checkout?mode=duplicate");

        toast({
          title: "Order Ready for Duplication:",
          description: "Redirecting to checkout page with pre-filled data...",
        });
      } else {
        console.error("Duplicate order failed or no data returned:", result);
        throw new Error("No data returned from duplicate order");
      }
    } catch (error) {
      console.error("handleDuplicate error:", error);
      toast({
        title: "Error:",
        description: "Failed to prepare duplicate order. Please try again.",
        variant: "destructive",
      });
    }
  }
  // if (ordersLoading || eventsLoading) {
  //   return (
  //     <div className="flex h-full w-full items-center justify-center">
  //       <Spinner />
  //     </div>
  //   );
  // }

  return (
    <div className="flex flex-1 flex-col">
      <h1 className="text-3xl font-bold">Orders</h1>
      <DataTable
        data={filteredOrders}
        columns={columns}
        postType="Order"
        filterComponent={statusFilterControls}
        filterColumns={["_id", "eventId"]}
        // Inject bulk delete button into the right side controls
        // by composing within filterComponent via an extra button
        // (DataTable renders filterComponent under the header controls).
        onAddNew={async () => {
          const id = await createOrder({
            createdById: "seed-user",
            status: "Draft",
          });
          router.push(`/admin/orders/${String(id)}`);
        }}
      />
      <div className="mt-2 flex justify-end">
        <Button
          variant="destructive"
          onClick={async () => {
            try {
              // Collect selected ids from the table DOM by data-state attribute
              // and reading the first cell which contains a Link to the order id.
              // Since we control columns, we can also just use the orders + statusFilter.
              const selected: string[] = [];
              const rows = document.querySelectorAll(
                "table tbody tr[data-state='selected']",
              );
              rows.forEach((tr) => {
                const link = tr.querySelector(
                  "a[href^='/admin/orders/']",
                ) as HTMLAnchorElement | null;
                const id = link
                  ?.getAttribute("href")
                  ?.split("/admin/orders/")[1];
                if (id) selected.push(id);
              });
              if (selected.length === 0) {
                toast({ title: "No orders selected" });
                return;
              }
              await bulkDelete({ ids: selected as unknown as Array<any> });
              toast({ title: `Deleted ${selected.length} order(s)` });
            } catch (e) {
              toast({
                title: "Failed to delete",
                description: e instanceof Error ? e.message : String(e),
                variant: "destructive",
              });
            }
          }}
        >
          Delete Selected
        </Button>
      </div>
    </div>
  );
}
