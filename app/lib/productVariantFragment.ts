/** Full variant shape shared by the product page and the feature pages. */
export const PRODUCT_VARIANT_FRAGMENT = `#graphql
  fragment ClaraProductVariant on ProductVariant {
    id
    title
    availableForSale
    barcode
    price {
      amount
      currencyCode
    }
    compareAtPrice {
      amount
      currencyCode
    }
    selectedOptions {
      name
      value
    }
    image {
      id
      url
      altText
      width
      height
    }
    product {
      handle
      title
    }
    sku
  }
` as const;
