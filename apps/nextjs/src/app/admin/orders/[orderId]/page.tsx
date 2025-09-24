import React from "react";

import OrderForm from "../_components/OrderForm";

async function OrderIdPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  return (
    <div>
      <OrderForm orderId={orderId} />
    </div>
  );
}

export default OrderIdPage;
