import ProductCategoriesForm from "../_components/ProductCategoriesForm";

export default function AdminProductCategoryPage({
  params,
}: {
  params: { categoryId: string };
}) {
  return (
    <div>
      <h1>Product Category</h1>
      <ProductCategoriesForm categoryId={params.categoryId} />
    </div>
  );
}
