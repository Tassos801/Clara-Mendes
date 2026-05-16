export const PRODUCT_CARD_FRAGMENT = `#graphql
  fragment ClaraProductCard on Product {
    id
    handle
    title
    vendor
    productType
    tags
    featuredImage {
      id
      url
      altText
      width
      height
    }
    images(first: 2) {
      nodes {
        id
        url
        altText
        width
        height
      }
    }
    priceRange {
      minVariantPrice {
        amount
        currencyCode
      }
    }
    cardVariant: variants(first: 1) {
      nodes {
        id
        availableForSale
        compareAtPrice {
          amount
          currencyCode
        }
        image {
          id
          url
          altText
          width
          height
        }
        price {
          amount
          currencyCode
        }
        product {
          handle
          title
        }
        selectedOptions {
          name
          value
        }
        title
      }
    }
  }
` as const;
