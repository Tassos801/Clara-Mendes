// NOTE: https://shopify.dev/docs/api/customer/latest/queries/order
export const CUSTOMER_ORDER_QUERY = `#graphql
  fragment OrderMoney on MoneyV2 {
    amount
    currencyCode
  }
  fragment OrderLineItem on LineItem {
    id
    title
    variantTitle
    quantity
    price {
      ...OrderMoney
    }
    image {
      altText
      height
      id
      url
      width
    }
  }
  fragment CustomerOrder on Order {
    id
    name
    confirmationNumber
    processedAt
    statusPageUrl
    fulfillments(first: 1) {
      nodes {
        status
      }
    }
    shippingAddress {
      name
      formatted(withName: true)
      formattedArea
    }
    subtotal {
      ...OrderMoney
    }
    totalTax {
      ...OrderMoney
    }
    totalPrice {
      ...OrderMoney
    }
    lineItems(first: 100) {
      nodes {
        ...OrderLineItem
      }
    }
  }
  query CustomerOrder($language: LanguageCode, $orderId: ID!)
    @inContext(language: $language) {
    order(id: $orderId) {
      ... on Order {
        ...CustomerOrder
      }
    }
  }
` as const;
