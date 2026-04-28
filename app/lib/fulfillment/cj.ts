import type {FulfillmentIntake} from './shopifyWebhook';

export type CjEnv = {
  CJ_ACCESS_TOKEN?: string;
  CJ_DEFAULT_LOGISTIC_NAME?: string;
  CJ_FROM_COUNTRY_CODE?: string;
  CJ_PLATFORM_TOKEN?: string;
  CJ_SHOP_LOGISTICS_TYPE?: string;
  CJ_STORAGE_ID?: string;
  CJ_STORE_NAME?: string;
};

type CjCreateOrderResponse = {
  code?: number;
  data?: unknown;
  message?: string;
  requestId?: string;
  result?: boolean;
  success?: boolean;
};

const CJ_CREATE_ORDER_URL =
  'https://developers.cjdropshipping.com/api2.0/v1/shopping/order/createOrderV3';

export async function maybeSubmitCjOrder({
  env,
  intake,
}: {
  env: CjEnv;
  intake: FulfillmentIntake;
}) {
  if (!intake.autoSubmit || intake.mode !== 'cj') {
    return {status: 'dry-run' as const};
  }

  if (!env.CJ_ACCESS_TOKEN) {
    return {reason: 'CJ_ACCESS_TOKEN is not configured', status: 'skipped' as const};
  }

  if (intake.lines.length === 0) {
    return {reason: 'Order has no shippable line items', status: 'skipped' as const};
  }

  if (intake.missingMappings.length > 0) {
    return {
      missingMappings: intake.missingMappings.map((line) => ({
        lineItemId: line.lineItemId,
        title: line.title,
        variantId: line.variantId,
      })),
      reason: 'One or more order lines are missing CJ vid/sku mapping',
      status: 'skipped' as const,
    };
  }

  if (!intake.shippingAddress) {
    return {reason: 'Order is missing shipping address', status: 'skipped' as const};
  }

  const missingRequiredFields = getMissingRequiredFields({env, intake});
  if (missingRequiredFields.length > 0) {
    return {
      missingRequiredFields,
      reason: 'CJ submission is missing required order fields',
      status: 'skipped' as const,
    };
  }

  const response = await fetch(CJ_CREATE_ORDER_URL, {
    body: JSON.stringify(buildCjCreateOrderPayload({env, intake})),
    headers: {
      'CJ-Access-Token': env.CJ_ACCESS_TOKEN,
      'Content-Type': 'application/json',
      platformToken: env.CJ_PLATFORM_TOKEN ?? '',
    },
    method: 'POST',
  });
  const body = (await response.json().catch(() => null)) as
    | CjCreateOrderResponse
    | null;

  return {
    cj: body,
    httpStatus: response.status,
    ok: response.ok && body?.result !== false,
    status: 'submitted' as const,
  };
}

function getMissingRequiredFields({
  env,
  intake,
}: {
  env: CjEnv;
  intake: FulfillmentIntake;
}) {
  const address = intake.shippingAddress!;
  const requiredFields = {
    CJ_DEFAULT_LOGISTIC_NAME: env.CJ_DEFAULT_LOGISTIC_NAME,
    shippingAddress: address.address1,
    shippingCity: address.city,
    shippingCountry: address.country,
    shippingCountryCode: address.country_code,
    shippingCustomerName: getCustomerName(address),
  };

  return Object.entries(requiredFields)
    .filter(([, value]) => !String(value ?? '').trim())
    .map(([field]) => field);
}

function buildCjCreateOrderPayload({
  env,
  intake,
}: {
  env: CjEnv;
  intake: FulfillmentIntake;
}) {
  const address = intake.shippingAddress!;
  const customerName = getCustomerName(address);

  return {
    email: intake.email ?? '',
    fromCountryCode: env.CJ_FROM_COUNTRY_CODE ?? 'CN',
    iossNumber: '',
    iossType: '',
    logisticName: env.CJ_DEFAULT_LOGISTIC_NAME ?? '',
    orderNumber: intake.orderName,
    platform: 'shopify',
    products: intake.lines.map((line) => ({
      quantity: line.quantity,
      sku: line.cjSku,
      storeLineItemId: line.lineItemId,
      vid: line.cjVid,
    })),
    shippingAddress: address.address1 ?? '',
    shippingAddress2: address.address2 ?? '',
    shippingCity: address.city ?? '',
    shippingCountry: address.country ?? '',
    shippingCountryCode: address.country_code ?? '',
    shippingCustomerName: customerName,
    shippingPhone: address.phone ?? '',
    shippingProvince: address.province ?? address.city ?? '',
    shippingZip: address.zip ?? '',
    shopAmount: intake.totalPrice ?? '',
    shopLogisticsType: Number(env.CJ_SHOP_LOGISTICS_TYPE ?? 2),
    storageId: env.CJ_STORAGE_ID ?? '',
    storeName: env.CJ_STORE_NAME ?? 'Clara Mendes',
  };
}

function getCustomerName(address: FulfillmentIntake['shippingAddress']) {
  if (!address) return '';

  return (
    address.name ||
    [address.first_name, address.last_name].filter(Boolean).join(' ')
  ).trim();
}
