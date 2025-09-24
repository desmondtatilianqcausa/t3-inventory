"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/app/_components/ui/card";
import type { Doc, Id } from "@/convex/_generated/dataModel";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "~/app/_components/Table";
import EventForm from "~/app/admin/events/_components/EventForm";
import Link from "next/link";
import React from "react";
import { Separator } from "~/app/_components/ui/separator";
import { api } from "@/convex/_generated/api";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";

type Order = Doc<"orders">;

export default function EventPage() {
  const { eventId } = useParams();
  const orders = useQuery(api.orders.queries.listByEvent, {
    eventId: eventId as Id<"events">,
    limit: 100,
  });

  const orderColumns: ColumnDef<Order>[] = [
    {
      accessorKey: "_id",
      header: "Order",
      cell: ({ row }) => {
        const id = String(row.getValue("_id"));
        return (
          <Link href={`/admin/orders/${id}`} className="underline">
            {id}
          </Link>
        );
      },
    },
    { accessorKey: "totalQuantity", header: "Qty" },
    {
      accessorKey: "totalPrice",
      header: "Total",
      cell: ({ row }) => {
        const value = Number(row.getValue("totalPrice")) || 0;
        return <span>${value.toFixed(2)}</span>;
      },
    },
    { accessorKey: "status", header: "Status" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Event</CardTitle>
      </CardHeader>
      <Separator />
      <CardContent className="space-y-8 p-6">
        <EventForm eventId={eventId} />

        <DataTable
          title="Orders for this Event"
          titleSize="lg"
          data={orders ?? []}
          columns={orderColumns}
          postType="Order"
          filterColumns={["_id", "status"]}
          showAddButton={false}
        />
      </CardContent>
    </Card>
  );
}
