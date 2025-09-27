import ProductForm from "../_components/ProductForm";
import React from "react";

function ProductPage({ params }: { params: { productId: string } }) {
  return (
    <div>
      <ProductForm productId={params.productId} />
    </div>
  );
}

export default ProductPage;
