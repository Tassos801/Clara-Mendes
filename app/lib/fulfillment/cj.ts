import type {FulfillmentIntake} from './shopifyWebhook';

export type CjEnv = {
  CJ_ACCESS_TOKEN?: string;
  CJ_API_KEY?: string;
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

type CjAccessTokenResponse = {
  code?: number;
  data?: {
    accessToken?: string;
    accessTokenExpiryDate?: string;
    refreshToken?: string;
    refreshTokenExpiryDate?: string;
  } | null;
  message?: string;
  requestId?: string;
  result?: boolean;
  success?: boolean;
};

type CjAccessTokenResult =
  | {
      accessToken: string;
      expiresAt?: string;
      source: 'api-key' | 'env-token';
    }
  | {
      auth?: SanitizedCjResponse;
      httpStatus?: number;
      reason: string;
    };

type SanitizedCjResponse = Pick<
  CjAccessTokenResponse,
  'code' | 'message' | 'requestId' | 'result' | 'success'
>;

type CachedCjAccessToken = {
  accessToken: string;
  expiresAt?: string;
  expiresAtMs: number;
};

const CJ_CREATE_ORDER_URL =
  'https://developers.cjdropshipping.com/api2.0/v1/shopping/order/createOrderV3';
const CJ_GET_ACCESS_TOKEN_URL =
  'https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken';
const CJ_TOKEN_EXPIRY_BUFFER_MS = 60 * 60 * 1000;

let cachedCjAccessToken: CachedCjAccessToken | null = null;

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

  if (intake.lines.length === 0) {
    return {
      reason: 'Order has no shippable line items',
      status: 'skipped' as const,
    };
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
    return {
      reason: 'Order is missing shipping address',
      status: 'skipped' as const,
    };
  }

  const missingRequiredFields = getMissingRequiredFields({env, intake});
  if (missingRequiredFields.length > 0) {
    return {
      missingRequiredFields,
      reason: 'CJ submission is missing required order fields',
      status: 'skipped' as const,
    };
  }

  const token = await getCjAccessToken(env);
  if (!('accessToken' in token)) {
    return {
      ...token,
      status: 'skipped' as const,
    };
  }

  const response = await fetch(CJ_CREATE_ORDER_URL, {
    body: JSON.stringify(buildCjCreateOrderPayload({env, intake})),
    headers: {
      'CJ-Access-Token': token.accessToken,
      'Content-Type': 'application/json',
      platformToken: env.CJ_PLATFORM_TOKEN ?? '',
    },
    method: 'POST',
  });
  const body = (await response
    .json()
    .catch(() => null)) as CjCreateOrderResponse | null;

  return {
    auth: {
      expiresAt: token.expiresAt,
      source: token.source,
    },
    cj: body,
    httpStatus: response.status,
    ok: response.ok && body?.result !== false,
    status: 'submitted' as const,
  };
}

async function getCjAccessToken(env: CjEnv): Promise<CjAccessTokenResult> {
  const configuredAccessToken = env.CJ_ACCESS_TOKEN?.trim();
  if (configuredAccessToken) {
    return {
      accessToken: configuredAccessToken,
      source: 'env-token',
    };
  }

  const apiKey = env.CJ_API_KEY?.trim();
  if (!apiKey) {
    return {
      reason: 'CJ_API_KEY or CJ_ACCESS_TOKEN is not configured',
    };
  }

  if (
    cachedCjAccessToken &&
    cachedCjAccessToken.expiresAtMs - CJ_TOKEN_EXPIRY_BUFFER_MS > Date.now()
  ) {
    return {
      accessToken: cachedCjAccessToken.accessToken,
      expiresAt: cachedCjAccessToken.expiresAt,
      source: 'api-key',
    };
  }

  const response = await fetch(CJ_GET_ACCESS_TOKEN_URL, {
    body: JSON.stringify({apiKey}),
    headers: {'Content-Type': 'application/json'},
    method: 'POST',
  });
  const body = (await response
    .json()
    .catch(() => null)) as CjAccessTokenResponse | null;
  const accessToken = body?.data?.accessToken?.trim();

  if (!response.ok || body?.result === false || !accessToken) {
    return {
      auth: sanitizeCjAuthResponse(body),
      httpStatus: response.status,
      reason: 'CJ API key authentication failed',
    };
  }

  cachedCjAccessToken = {
    accessToken,
    expiresAt: body?.data?.accessTokenExpiryDate,
    expiresAtMs: parseCjExpiryMs(body?.data?.accessTokenExpiryDate),
  };

  return {
    accessToken,
    expiresAt: body?.data?.accessTokenExpiryDate,
    source: 'api-key',
  };
}

function parseCjExpiryMs(value?: string) {
  const parsed = value ? Date.parse(value) : NaN;

  if (Number.isFinite(parsed)) return parsed;

  return Date.now() + 14 * 24 * 60 * 60 * 1000;
}

function sanitizeCjAuthResponse(
  body: CjAccessTokenResponse | null,
): SanitizedCjResponse | undefined {
  if (!body) return undefined;

  return {
    code: body.code,
    message: body.message,
    requestId: body.requestId,
    result: body.result,
    success: body.success,
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
