"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "src/app/_components/ui/button";

import OrderForm from "../_components/OrderForm";

function HeaderSave() {
  const router = useRouter();
  const [status, setStatus] = React.useState<string | undefined>(undefined);
  React.useEffect(() => {
    const handle = (e: CustomEvent) => setStatus(e.detail as string);
    window.addEventListener("app:orderStatusChanged", handle as EventListener);
    const initial = (window as any).__orderFormState?.status as
      | string
      | undefined;
    if (initial) setStatus(initial);
    return () =>
      window.removeEventListener(
        "app:orderStatusChanged",
        handle as EventListener,
      );
  }, []);

  const showToggle = React.useMemo(() => {
    return (
      status === "Draft" ||
      status === "Awaiting Payment" ||
      status === "Check-Out"
    );
  }, [status]);

  const nextLabel = React.useMemo(() => {
    if (status === "Check-Out") return "Check-In";
    return "Check-Out";
  }, [status]);

  const handleToggle = React.useCallback(() => {
    const api = (window as any).__orderFormActions;
    if (!api) return;
    if (status === "Check-Out") api.confirmAndSetStatus("Check-In");
    else api.confirmAndSetStatus("Check-Out");
  }, [status]);

  React.useEffect(() => {
    const leftNode = (
      <Button variant="outline" onClick={() => router.push("/admin/orders")}>
        ← Back to Orders
      </Button>
    );
    const rightNode = (
      <>
        <Button
          className="bg-green-700 text-sm font-bold hover:bg-green-600"
          onClick={() => {
            const form = document.querySelector(
              "form",
            ) as HTMLFormElement | null;
            form?.requestSubmit();
          }}
        >
          Save
        </Button>
        {showToggle && (
          <Button
            className="bg-blue-700 text-sm font-bold hover:bg-blue-600"
            onClick={handleToggle}
          >
            {nextLabel}
          </Button>
        )}
      </>
    );
    window.dispatchEvent(
      new CustomEvent("app:setHeaderLeftActions", { detail: leftNode }),
    );
    window.dispatchEvent(
      new CustomEvent("app:setHeaderActions", { detail: rightNode }),
    );
    return () => {
      window.dispatchEvent(
        new CustomEvent("app:setHeaderLeftActions", { detail: null }),
      );
      window.dispatchEvent(
        new CustomEvent("app:setHeaderActions", { detail: null }),
      );
    };
  }, [handleToggle, nextLabel, router, showToggle]);
  return null;
}

function OrderIdPage() {
  const { orderId } = useParams<{ orderId: string }>();
  return (
    <div>
      <HeaderSave />
      <OrderForm orderId={orderId} />
    </div>
  );
}

export default OrderIdPage;
