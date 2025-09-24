"use client";

import { deleteOrder, duplicateOrder } from "./actions";
import { useMutation, useQuery } from "convex/react";

import { DataTable } from "../../_components/Table";
import React from "react";
import { Spinner } from "~/app/_components/ui/loading-spinner";
import { api } from "@/convex/_generated/api";
import { createColumns } from "./columns";
import { toast } from "../../_components/ui/use-toast";
import { useRouter } from "next/navigation";

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
  console.log("orders", orders);

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
        data={orders}
        columns={columns}
        postType="Order"
        filterColumns={["_id", "eventId"]}
        onAddNew={async () => {
          const id = await createOrder({
            createdById: "seed-user",
            status: "Draft",
          });
          router.push(`/admin/orders/${String(id)}`);
        }}
      />
    </div>
  );
}
