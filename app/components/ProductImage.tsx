type ProductImageData = {
  altText?: string | null;
  url?: string;
};

export function ProductImage({image}: {image?: ProductImageData | null}) {
  if (!image?.url) return <div className="product-image" />;

  return (
    <div className="product-image">
      <img alt={image.altText || 'Product image'} src={image.url} />
    </div>
  );
}
