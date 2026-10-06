import {
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {Link, redirect, useLoaderData} from 'react-router';
import {
  Analytics,
  getSelectedProductOptions,
  Image,
  ShopPayButton,
} from '@shopify/hydrogen';
import type {Route} from './+types/products.$handle';
import {AddToCartButton} from '~/components/AddToCartButton';
import {
  ClaraProductCard,
  type ClaraCardProduct,
} from '~/components/ClaraProductCard';
import {StructuredData} from '~/components/StructuredData';
import {useAside} from '~/components/Aside';
import {RecentlyViewed} from '~/components/RecentlyViewed';
import {
  buildPhoneCaseUrl,
  formatPhoneCaseDeviceList,
} from '~/lib/artExtensions';
import {
  buildCapsuleTagQuery,
  CAPSULES,
  findShopCapsuleForHandle,
  shopCapsulePath,
} from '~/lib/capsules';
import {getCapsulePage} from '~/lib/capsulePages';
import {
  filterDemoProducts,
  isDemoProduct,
  isReleasedExtensionHandle,
  isReleasedProductHandle,
  isStagedPersonalisedHandle,
  PHONE_CASE_HANDLE,
} from '~/lib/catalogFilters';
import {
  TOUGH_CASE_ARTWORK_OPTION,
  TOUGH_CASE_DESIGNS,
  TOUGH_CASE_HANDLE,
} from '~/lib/toughCase';
import {
  buildClassicFrameUrl,
  CLASSIC_FRAME_HANDLE,
  CLASSIC_FRAME_SIZE_LABELS,
  filterAccurateClassicFrameImages,
  getUnframedPresentationRedirectPath,
  isUnframedPresentation,
  selectAccurateClassicFrameImage,
  selectedClassicFrameSize,
} from '~/lib/classicFrame';
import {NatalConfigurator} from '~/components/NatalConfigurator';
import pastelPots from '../../data/pastel-plant-pots.json';
import {
  SkyConfigurator,
  type SkyConfiguratorStatus,
} from '~/components/SkyConfigurator';
import {toNatalCartAttributes, type NatalParams} from '~/lib/natal/params';
import {NATAL_PRODUCT_HANDLE} from '~/lib/natal/products';
import {
  formatSkyDate,
  SKY_THEME_LABELS,
  toCartAttributes,
} from '~/lib/sky/params';
import {
  SKY_FINISH_LABELS,
  SKY_PRODUCT_TYPE,
  SKY_SIZES,
  skyFinishFromOptions,
  skySizeFromOptions,
} from '~/lib/sky/products';
import {DEFAULT_SKY_THEME} from '~/lib/sky/themes';
import {featurePageRedirect} from '~/lib/featurePages';
import {formatMoney, type MoneyAmount} from '~/lib/money';
import {ProductPrice} from '~/components/ProductPrice';
import {ProductDetail} from '~/components/ProductDetail';
import {VariantOptions} from '~/components/VariantOptions';
import {sizedImageUrl} from '~/lib/cartPresentation';
import {selectedOptionsSummary} from '~/lib/variantOptions';
import {PRODUCT_VARIANT_FRAGMENT} from '~/lib/productVariantFragment';
import {PRODUCT_CARD_FRAGMENT} from '~/lib/productCardFragment';
import {deriveCardPricing} from '~/lib/productCardPricing';
import {recordRecentlyViewed} from '~/lib/recentlyViewed';
import {getProductDescription, getProductLede} from '~/lib/productCopy';
import {
  clampCarouselIndex,
  cycleCarouselIndex,
  nearestCarouselIndex,
  resolveZoomSwipe,
} from '~/lib/productGalleryCarousel';
import {
  filterGalleryImagesForSize,
  printScaleGeometry,
  printSizeAvailabilityCopy,
  selectedPrintSize,
  type PrintSizeKey,
} from '~/lib/productSizePresentation';
import {
  breadcrumbSchema,
  buildSeoMeta,
  getCanonicalUrl,
  productSchema,
} from '~/lib/seo';
import {wallSetsContainingHandle} from '~/lib/wallSets';
import {keepTabInside} from '~/lib/focusTrap';
import {
  DELIVERY_EU_BUSINESS_DAYS,
  DELIVERY_INTERNATIONAL_BUSINESS_DAYS,
  DISPATCH_WINDOW_BUSINESS_DAYS,
  PRODUCTION_WINDOW_BUSINESS_DAYS,
  RETURN_WINDOW_DAYS,
  STOREFRONT_ORIGIN,
} from '~/lib/storefrontBasics';
import {
  curatedDisplayTitle,
  deliveryIncludedPhrase,
  getCuratedProduct,
  withCuratedImages,
} from '~/lib/curatedProducts';
import {
  BOOK_NOOK_PRODUCT_TYPE,
  BOOK_NOOKS_PATH,
  bookNookSpecRows,
  getBookNookTheme,
  isBookNook,
} from '~/lib/bookNooks';
import {
  ProductShippingText,
  type ShippingReach,
} from '~/components/ProductShippingText';
import {ReviewsSection} from '~/components/reviews/ReviewsSection';
import {
  parseReviewsMetafield,
  type ReviewsMetafieldResponse,
} from '~/lib/reviews';
import {summarizeReviews, type ProductReviewsData} from '~/lib/reviewTypes';

type ProductImage = {
  altText?: string | null;
  height?: number | null;
  url: string;
  width?: number | null;
};

type ProductOptionValue = {
  id: string;
  name: string;
};

type ProductOption = {
  id: string;
  name: string;
  optionValues: ProductOptionValue[];
};

type SelectedOption = {
  name: string;
  value: string;
};

type ProductVariant = {
  id: string;
  title: string;
  availableForSale: boolean;
  barcode?: string | null;
  price: MoneyAmount;
  compareAtPrice?: MoneyAmount | null;
  selectedOptions: SelectedOption[];
  sku?: string | null;
  image?: ProductImage | null;
  product: {
    handle: string;
    title: string;
  };
};

type ProductDetail = ClaraCardProduct & {
  description: string;
  descriptionHtml?: string;
  galleryImages?: {nodes: ProductImage[]};
  options: ProductOption[];
  selectedOrFirstAvailableVariant?: ProductVariant | null;
  variants: {
    nodes: ProductVariant[];
  };
};

type PhoneCaseVariantNode = {
  availableForSale: boolean;
  image?: ProductImage | null;
  price?: MoneyAmount | null;
  selectedOptions: SelectedOption[];
};

type PhoneCaseCrossSell = {
  capsuleTitle: string;
  image: ProductImage | null;
  price: MoneyAmount | null;
  url: string;
};

type ToughCaseCrossSell = {
  artworkTitle: string;
  image: ProductImage | null;
  price: MoneyAmount | null;
  url: string;
};

type ToughCaseOptionNode = {
  name: string;
  optionValues: Array<{
    name: string;
    firstSelectableVariant?: {
      availableForSale: boolean;
      image?: ProductImage | null;
      price?: MoneyAmount | null;
    } | null;
  }>;
};

type ClassicFrameCrossSell = {
  image: ProductImage;
  price: MoneyAmount;
  sizeLabel: string;
  url: string;
};

const EMPTY_SKY_STATUS: SkyConfiguratorStatus = {
  nextRequired: 'place',
  params: null,
  preview: 'example',
};

function sanitizeOriginalArtProduct(product: ProductDetail): ProductDetail {
  const variants = product.variants.nodes.filter((variant) =>
    isUnframedPresentation(variant.selectedOptions),
  );
  const selectedVariant =
    product.selectedOrFirstAvailableVariant &&
    isUnframedPresentation(
      product.selectedOrFirstAvailableVariant.selectedOptions,
    )
      ? product.selectedOrFirstAvailableVariant
      : (variants.find((variant) => variant.availableForSale) ??
        variants[0] ??
        null);

  return {
    ...product,
    cardVariant: {
      nodes: variants.slice(0, 1),
    },
    options: product.options.filter(
      (option) => option.name.trim().toLowerCase() !== 'presentation',
    ),
    selectedOrFirstAvailableVariant: selectedVariant,
    variants: {
      ...product.variants,
      nodes: variants,
    },
  };
}

/**
 * Shopify only honours a complete option set: `?Size=20+×+24+in` without
 * `Finish=` falls back to the first variant, so a hand-built or shared link
 * showed 8 × 10 in at the 8 × 10 price. Pick the variant that matches every
 * option the URL does name, preferring one that is on sale.
 */
function resolveRequestedVariant(
  product: ProductDetail,
  requested: SelectedOption[],
): ProductDetail {
  const optionNames = new Set(
    product.options.map((option) => option.name.toLowerCase()),
  );
  const wanted = requested.filter((option) =>
    optionNames.has(option.name.toLowerCase()),
  );
  if (!wanted.length) return product;
  const matches = (variant: ProductVariant) =>
    wanted.every((option) =>
      variant.selectedOptions.some(
        (selected) =>
          selected.name.toLowerCase() === option.name.toLowerCase() &&
          selected.value === option.value,
      ),
    );
  const current = product.selectedOrFirstAvailableVariant;
  if (current && matches(current)) return product;
  const candidates = product.variants.nodes.filter(matches);
  const match =
    candidates.find((variant) => variant.availableForSale) ?? candidates[0];
  return match ? {...product, selectedOrFirstAvailableVariant: match} : product;
}

function sanitizeClassicFrameProduct(product: ProductDetail): ProductDetail {
  const variants: ProductVariant[] = [...product.variants.nodes];
  const selectedVariant: ProductVariant | null =
    (product.selectedOrFirstAvailableVariant as ProductVariant | null) ??
    variants.find((variant) => variant.availableForSale) ??
    variants[0] ??
    null;
  const accurateImages = filterAccurateClassicFrameImages([
    ...(product.galleryImages?.nodes ?? []),
    ...(product.images?.nodes ?? []),
    ...variants.flatMap((variant) => (variant.image ? [variant.image] : [])),
  ]).filter(
    (image, index, list) =>
      list.findIndex((candidate) => candidate.url === image.url) === index,
  );
  const featuredImage =
    selectAccurateClassicFrameImage([
      product.featuredImage,
      selectedVariant?.image,
      ...accurateImages,
    ]) ?? null;

  return {
    ...product,
    cardVariant: {
      nodes: variants.slice(0, 1),
    },
    featuredImage,
    galleryImages: {nodes: accurateImages},
    images: {nodes: accurateImages},
    options: product.options,
    selectedOrFirstAvailableVariant: selectedVariant,
    variants: {
      ...product.variants,
      nodes: variants,
    },
  };
}

/** Branded curated images are storefront files; share tags need full URLs. */
function absoluteImageUrl(url?: string | null) {
  return url?.startsWith('/') ? `${STOREFRONT_ORIGIN}${url}` : url;
}

export const meta: Route.MetaFunction = ({data}) => {
  const product = data?.product;
  const description = product ? getProductDescription(product) : null;

  return buildSeoMeta({
    description:
      description ||
      'Shop this Clara Mendes product through secure Shopify checkout.',
    image: absoluteImageUrl(product?.featuredImage?.url),
    title: product?.title ?? 'Product',
    type: 'product',
    url: data?.seoUrl ?? `${STOREFRONT_ORIGIN}/products`,
  });
};

export async function loader({context, params, request}: Route.LoaderArgs) {
  const selectedOptions = getSelectedProductOptions(request);
  const handle = params.handle;

  if (!handle) {
    throw new Response('Product handle is required', {status: 400});
  }

  // Feature-page products (Your Sky) are sold on their own page; the old
  // product URL keeps working through a permanent redirect that preserves
  // the variant selection in the query string.
  const featureRedirect = featurePageRedirect(
    handle,
    new URL(request.url).search,
  );
  if (featureRedirect) {
    throw redirect(featureRedirect, 301);
  }

  // Launch capsules carry the presentation guard and cross-sells below.
  const capsule = CAPSULES.find((entry) => entry.handles.includes(handle));
  // "Pair with" and the breadcrumb also cover print-catalog collections:
  // companions come from the same capsule first, best sellers only fill any
  // remaining slots.
  const shopCapsule = findShopCapsuleForHandle(handle);
  const unframedRedirect = capsule
    ? getUnframedPresentationRedirectPath(request.url)
    : null;
  if (unframedRedirect) {
    throw redirect(unframedRedirect);
  }
  // Cross-sell stays dormant until the phone case's release flag flips —
  // the sentinel handle matches no product, so the query returns null.
  const phoneCaseEligible =
    Boolean(capsule) && isReleasedExtensionHandle(PHONE_CASE_HANDLE);
  const classicFrameEligible =
    Boolean(capsule) && isReleasedExtensionHandle(CLASSIC_FRAME_HANDLE);
  // Every released print is also an artwork on the tough phone case; the
  // cross-sell stays dormant until the case's release flag flips.
  const toughCaseDesign = TOUGH_CASE_DESIGNS.find(
    (design) => design.sourceHandle === handle,
  );
  const toughCaseEligible =
    Boolean(toughCaseDesign) && isReleasedProductHandle(TOUGH_CASE_HANDLE);
  // Book nooks pair with the other nooks on the shelf before best sellers.
  const isNookPage = isBookNook(getCuratedProduct(handle));

  const data = await context.storefront.query(PRODUCT_QUERY, {
    variables: {
      // The fallback is a tag no product carries, so non-capsule products
      // get zero capsule siblings (tag is a supported search field; an
      // unsupported field would be silently ignored and match everything).
      capsuleQuery: shopCapsule
        ? buildCapsuleTagQuery(shopCapsule)
        : isNookPage
          ? `product_type:"${BOOK_NOOK_PRODUCT_TYPE}"`
          : 'tag:"__no-capsule__"',
      first: 4,
      classicFrameHandle: classicFrameEligible
        ? CLASSIC_FRAME_HANDLE
        : '__classic-frame-not-applicable__',
      handle,
      phoneCaseHandle: phoneCaseEligible
        ? PHONE_CASE_HANDLE
        : '__phone-case-staged__',
      selectedOptions,
      toughCaseHandle: toughCaseEligible
        ? TOUGH_CASE_HANDLE
        : '__tough-case-staged__',
    },
  });

  if (!data.product) {
    throw new Response('Product not found', {status: 404});
  }

  // Shopify resolves handles case-insensitively, but the capsule table and
  // the presentation guard above are exact: a wrongly cased link would skip
  // both and expose the staged framed variants. Send it to the canonical URL.
  if (data.product.handle !== handle) {
    throw redirect(
      `/products/${data.product.handle}${new URL(request.url).search}`,
      301,
    );
  }

  const rawProduct = resolveRequestedVariant(
    data.product as ProductDetail,
    selectedOptions,
  );
  const product = withCuratedImages(
    capsule
      ? sanitizeOriginalArtProduct(rawProduct)
      : handle === CLASSIC_FRAME_HANDLE
        ? sanitizeClassicFrameProduct(rawProduct)
        : rawProduct,
  );
  const matchingFrameSize = capsule
    ? selectedClassicFrameSize(
        product.selectedOrFirstAvailableVariant?.selectedOptions,
      )
    : null;

  // A staged personalised product stays hidden everywhere, but the preview
  // environment may unlock its PDP so the end-to-end order can be tested
  // before the release flag flips.
  const previewUnlocked =
    isStagedPersonalisedHandle(handle) &&
    context.env.SKY_PREVIEW_UNLOCK === 'true';
  if (isDemoProduct(product) && !previewUnlocked) {
    throw redirect('/collections/all');
  }

  const parsedReviews = parseReviewsMetafield(
    (product as {reviewsMetafield?: ReviewsMetafieldResponse})
      .reviewsMetafield ?? null,
  );
  const reviews: ProductReviewsData = {
    reviews: parsedReviews,
    summary: summarizeReviews(parsedReviews),
  };

  const capsuleSiblings = filterDemoProducts(
    (data.capsuleProducts?.nodes ?? []) as ClaraCardProduct[],
  ).filter((product) => product.handle !== handle);
  const bestSellingFill = filterDemoProducts(
    data.relatedProducts.nodes as ClaraCardProduct[],
  ).filter(
    (product) =>
      product.handle !== handle &&
      !capsuleSiblings.some((sibling) => sibling.handle === product.handle),
  );

  const capsulePage = capsule ? getCapsulePage(capsule.slug) : null;

  const phoneCaseProduct = data.phoneCase as
    | (ClaraCardProduct & {caseVariants?: {nodes?: PhoneCaseVariantNode[]}})
    | null;
  let phoneCaseCrossSell: PhoneCaseCrossSell | null = null;
  if (capsule && phoneCaseProduct && !isDemoProduct(phoneCaseProduct)) {
    // The case variant carrying this capsule's artwork supplies the image
    // and price, so the cross-sell shows the artwork the buyer is viewing.
    const artworkVariant = (phoneCaseProduct.caseVariants?.nodes ?? []).find(
      (variant) =>
        variant.availableForSale &&
        variant.selectedOptions.some(
          (option) =>
            option.name === 'Artwork' && option.value === capsule.title,
        ),
    );
    if (artworkVariant) {
      phoneCaseCrossSell = {
        capsuleTitle: capsule.title,
        image: artworkVariant.image ?? phoneCaseProduct.featuredImage ?? null,
        price:
          artworkVariant.price ??
          phoneCaseProduct.priceRange?.minVariantPrice ??
          null,
        url: buildPhoneCaseUrl(capsule.title),
      };
    }
  }

  const toughCaseProduct = data.toughCase as
    (ClaraCardProduct & {caseOptions?: ToughCaseOptionNode[]}) | null;
  let toughCaseCrossSell: ToughCaseCrossSell | null = null;
  if (toughCaseDesign && toughCaseProduct && !isDemoProduct(toughCaseProduct)) {
    const artworkValue = toughCaseProduct.caseOptions
      ?.find((option) => option.name === TOUGH_CASE_ARTWORK_OPTION)
      ?.optionValues.find((value) => value.name === toughCaseDesign.title);
    const caseVariant = artworkValue?.firstSelectableVariant;
    if (caseVariant?.availableForSale) {
      toughCaseCrossSell = {
        artworkTitle: toughCaseDesign.title,
        image: caseVariant.image ?? null,
        price:
          caseVariant.price ??
          toughCaseProduct.priceRange?.minVariantPrice ??
          null,
        url: `/products/${TOUGH_CASE_HANDLE}?${new URLSearchParams({
          [TOUGH_CASE_ARTWORK_OPTION]: toughCaseDesign.title,
        }).toString()}`,
      };
    }
  }

  const classicFrameProduct = data.classicFrame as
    | (ClaraCardProduct & {frameVariants?: {nodes?: PhoneCaseVariantNode[]}})
    | null;
  let classicFrameCrossSell: ClassicFrameCrossSell | null = null;
  if (
    matchingFrameSize &&
    classicFrameProduct &&
    !isDemoProduct(classicFrameProduct)
  ) {
    const matchingVariant = (
      classicFrameProduct.frameVariants?.nodes ?? []
    ).find(
      (variant) =>
        variant.availableForSale &&
        variant.price &&
        variant.selectedOptions.some(
          (option) =>
            option.name.trim().toLowerCase() === 'size' &&
            option.value === matchingFrameSize,
        ),
    );
    const frameImage = selectAccurateClassicFrameImage([
      matchingVariant?.image,
      classicFrameProduct.featuredImage,
      ...(classicFrameProduct.images?.nodes ?? []),
    ]);
    if (matchingVariant?.price && frameImage) {
      classicFrameCrossSell = {
        image: frameImage,
        price: matchingVariant.price,
        sizeLabel: matchingFrameSize,
        url: buildClassicFrameUrl(matchingFrameSize),
      };
    }
  }

  return {
    capsuleSummary: shopCapsule
      ? {
          blurb: capsulePage?.pdpBlurb ?? null,
          path: shopCapsulePath(shopCapsule.slug),
          title: shopCapsule.title,
        }
      : null,
    phoneCaseCrossSell,
    classicFrameCrossSell,
    toughCaseCrossSell,
    product,
    // The section shows three cards; it is "from the same capsule" only
    // when no best-selling fill is among them.
    relatedFromCapsule: capsuleSiblings.length >= 3,
    relatedFromBookNooks: isNookPage && capsuleSiblings.length > 0,
    relatedProducts: [...capsuleSiblings, ...bestSellingFill],
    reviews,
    seoUrl: getCanonicalUrl(request, `/products/${product.handle}`),
    skyTheme: DEFAULT_SKY_THEME,
    storeDomain: context.env.PUBLIC_STORE_DOMAIN,
  };
}

export default function Product() {
  const {product} = useLoaderData<typeof loader>();
  // React Router keeps this route mounted when only the handle changes, so
  // without a key the quantity, a half-written review, the gallery position
  // and the configurators would carry over from the previous product.
  return <ProductPage key={product.id} />;
}

function ProductPage() {
  const {
    capsuleSummary,
    classicFrameCrossSell,
    phoneCaseCrossSell,
    product,
    relatedFromBookNooks,
    relatedFromCapsule,
    relatedProducts,
    reviews,
    seoUrl,
    skyTheme,
    storeDomain,
    toughCaseCrossSell,
  } = useLoaderData<typeof loader>();
  const {open} = useAside();
  const [quantity, setQuantity] = useState(1);
  const atcRef = useRef<HTMLDivElement>(null);
  const skyIntroRef = useRef<HTMLDivElement>(null);
  const [showStickyATC, setShowStickyATC] = useState(false);
  const selectedVariant =
    product.selectedOrFirstAvailableVariant ?? product.variants.nodes[0];
  const selectedVariantPrice = selectedVariant
    ? formatMoney(selectedVariant.price)
    : null;
  // Personalised Art products stage behind the personalised flags; the
  // handle picks which configurator mounts (the sky is the default so its
  // behavior is unchanged from before the second product existed).
  const isPersonalisedType =
    (product.productType || '').toLowerCase() ===
    SKY_PRODUCT_TYPE.toLowerCase();
  const isNatal = isPersonalisedType && product.handle === NATAL_PRODUCT_HANDLE;
  const isSkyMap = isPersonalisedType && !isNatal;
  // Complete personalisation is released only when the current preview has
  // rendered from the exact same canonical input.
  const [skyStatus, setSkyStatus] =
    useState<SkyConfiguratorStatus>(EMPTY_SKY_STATUS);
  const skyParams = skyStatus.params;
  const [natalParams, setNatalParams] = useState<NatalParams | null>(null);
  const skySize = skySizeFromOptions(selectedVariant?.selectedOptions);
  const skyFinish = skyFinishFromOptions(selectedVariant?.selectedOptions);
  const skyAttributes =
    isSkyMap && skyParams
      ? toCartAttributes(skyParams)
      : isNatal && natalParams
        ? toNatalCartAttributes(natalParams)
        : undefined;
  const purchaseBlocked =
    !selectedVariant?.availableForSale ||
    (isSkyMap && !skyParams) ||
    (isNatal && !natalParams);
  const isPersonalisedPending =
    (isSkyMap && !skyParams) || (isNatal && !natalParams);
  const personalisedPendingLabel = isNatal
    ? 'Add the name and birthplace'
    : 'Add your place and date';
  const purchaseButtonLabel = isPersonalisedPending
    ? personalisedPendingLabel
    : selectedVariant?.availableForSale && selectedVariantPrice
      ? `Add to cart - ${selectedVariantPrice}`
      : 'Sold out';
  const stickyButtonLabel = isPersonalisedPending
    ? personalisedPendingLabel
    : selectedVariant?.availableForSale && selectedVariantPrice
      ? `Add - ${selectedVariantPrice}`
      : 'Sold out';
  const skyPendingAction =
    skyStatus.nextRequired === 'place'
      ? {href: '#sky-place', label: 'Choose a place'}
      : skyStatus.nextRequired === 'date'
        ? {href: '#sky-date', label: 'Choose a date'}
        : {href: '#sky-preview', label: 'Check your preview'};
  const primaryImage =
    selectedVariant?.image ?? product.featuredImage ?? product.images?.nodes[0];
  // The sticky bar names what will be added: the chosen options beside the
  // price, and the flat artwork (a print variant's own image is a room
  // scene, unreadable at 44 px).
  const stickyThumb =
    (product.productType || '').toLowerCase() === 'art prints'
      ? (product.featuredImage ?? primaryImage)
      : primaryImage;
  const stickyThumbUrl = stickyThumb ? sizedImageUrl(stickyThumb.url, 96) : '';
  const stickyOptions = selectedOptionsSummary(
    selectedVariant?.selectedOptions,
    (product.productType || '').toLowerCase() === 'art prints'
      ? ['Presentation']
      : [],
  );
  const productDescription = getProductDescription(product);
  const curatedProduct = getCuratedProduct(product.handle);
  const displayTitle = curatedDisplayTitle(product);
  const bookNook = isBookNook(curatedProduct) ? curatedProduct : null;
  const bookNookTheme = getBookNookTheme(bookNook?.theme);
  const kitSpecRows = bookNookSpecRows(curatedProduct?.specs);
  const isArtPrint = (product.productType || '').toLowerCase() === 'art prints';
  // Cards and postcards ship on Prodigi's Budget (untracked letter-post)
  // service, so their reassurance copy must not promise a tracking email.
  const isLetterPost = ['cards', 'postcards'].includes(
    (product.productType || '').toLowerCase(),
  );
  const memberWallSets = isArtPrint
    ? wallSetsContainingHandle(product.handle)
    : [];
  const isClassicFrame = product.handle === CLASSIC_FRAME_HANDLE;
  const isPhoneCase =
    (product.productType || '').toLowerCase() === 'phone cases';
  const isBlanket = (product.productType || '').toLowerCase() === 'blankets';
  const potDesign = pastelPots.designs.find(
    (design) => design.handle === product.handle,
  );
  const isPlantPot = Boolean(potDesign);
  // Mirrors the Shopify shipping profiles: letter-post cards stay in the EU;
  // canvas and framed pieces leave the EU only where shipping stays within
  // the rate (docs/llm-wiki/modules/fulfillment.md).
  const isFramedSelection = Boolean(
    selectedVariant?.selectedOptions.some(
      (option) =>
        option.name.trim().toLowerCase() === 'finish' &&
        /frame/i.test(option.value) &&
        !/unframed/i.test(option.value),
    ),
  );
  const shippingReach: ShippingReach = isLetterPost
    ? 'eu'
    : (product.productType || '').toLowerCase() === 'canvas art' ||
        isClassicFrame ||
        (isPersonalisedType && isFramedSelection)
      ? 'selected'
      : 'worldwide';
  const productLede =
    potDesign?.story ?? curatedProduct?.tagline ?? getProductLede(product);
  const printSize = selectedPrintSize(selectedVariant?.selectedOptions);
  const selectedFrameSize = isClassicFrame
    ? selectedClassicFrameSize(selectedVariant?.selectedOptions)
    : null;
  const productAvailableForSale = product.variants.nodes.some(
    (variant) => variant.availableForSale,
  );
  const shopPayStoreUrl = storeDomain ? getStoreUrl(storeDomain) : null;
  const shopUrl = new URL('/collections/all', seoUrl).toString();
  const galleryLeadImage = isArtPrint
    ? (selectedVariant?.image ?? product.featuredImage ?? primaryImage)
    : primaryImage;
  const galleryImages = useMemo(() => {
    const images = [
      ...(galleryLeadImage ? [galleryLeadImage] : []),
      ...(product.galleryImages?.nodes ?? product.images?.nodes ?? []),
    ];

    const uniqueImages = images.filter(
      (image, index, list) =>
        image?.url &&
        list.findIndex((item) => item.url === image.url) === index,
    );
    const truthfulImages = isClassicFrame
      ? filterAccurateClassicFrameImages(uniqueImages)
      : uniqueImages;
    return filterGalleryImagesForSize(
      truthfulImages,
      printSize.key,
      isArtPrint,
    );
  }, [
    galleryLeadImage,
    isArtPrint,
    isClassicFrame,
    printSize.key,
    product.galleryImages?.nodes,
    product.images?.nodes,
  ]);
  useEffect(() => {
    const target = isSkyMap ? skyIntroRef.current : atcRef.current;
    if (!target) return;
    const observer = new IntersectionObserver(
      ([entry]) =>
        setShowStickyATC(
          !entry.isIntersecting && entry.boundingClientRect.top < 0,
        ),
      {threshold: 0},
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [isSkyMap]);

  useEffect(() => {
    // Snapshot the released "From" floor, never the selected variant —
    // a 20 × 24 viewing must not become the card price in the rail.
    const pricing = deriveCardPricing(product);
    recordRecentlyViewed({
      amount: pricing.price?.amount,
      currencyCode: pricing.price?.currencyCode,
      handle: product.handle,
      hasPriceRange: pricing.hasRange,
      id: product.id,
      imageAlt: primaryImage?.altText ?? undefined,
      imageUrl: primaryImage?.url,
      productType: product.productType ?? undefined,
      title: product.title,
    });
  }, [primaryImage?.altText, primaryImage?.url, product]);

  const openCart = useCallback(() => open('cart'), [open]);
  const productViewAnalytics = useMemo(
    () => ({
      products: selectedVariant
        ? [
            {
              id: product.id,
              productGid: product.id,
              title: product.title,
              name: product.title,
              price: selectedVariant.price.amount,
              currency: selectedVariant.price.currencyCode,
              vendor: product.vendor || 'Clara Mendes',
              brand: product.vendor || 'Clara Mendes',
              variantId: selectedVariant.id,
              variantGid: selectedVariant.id,
              variantTitle: selectedVariant.title,
              variantName: selectedVariant.title,
              quantity: 1,
              sku: selectedVariant.sku || undefined,
              productType: product.productType || undefined,
              category: product.productType || undefined,
            },
          ]
        : [],
    }),
    [
      product.id,
      product.productType,
      product.title,
      product.vendor,
      selectedVariant,
    ],
  );
  const addToCartAnalytics = useMemo(
    () => ({
      products: selectedVariant
        ? [
            {
              productGid: product.id,
              variantGid: selectedVariant.id,
              name: product.title,
              variantName: selectedVariant.title,
              brand: product.vendor || 'Clara Mendes',
              price: selectedVariant.price.amount,
              currency: selectedVariant.price.currencyCode,
              quantity,
              category: product.productType || undefined,
              sku: selectedVariant.sku || undefined,
            },
          ]
        : [],
    }),
    [
      product.id,
      product.productType,
      product.title,
      product.vendor,
      quantity,
      selectedVariant,
    ],
  );

  return (
    <div className="product-page">
      <StructuredData
        data={[
          productSchema({
            availableForSale: productAvailableForSale,
            description: productDescription,
            gtin: selectedVariant?.barcode,
            image: absoluteImageUrl(primaryImage?.url),
            priceRange: product.priceRange,
            productId: product.id,
            productType: product.productType,
            reviewSummary:
              reviews.summary.total > 0
                ? {
                    averageRating: reviews.summary.average,
                    count: reviews.summary.total,
                  }
                : undefined,
            sku: selectedVariant?.sku,
            title: product.title,
            url: seoUrl,
            vendor: product.vendor,
            variants: product.variants.nodes,
          }),
          breadcrumbSchema({
            items: [
              {name: 'Shop', url: shopUrl},
              ...(capsuleSummary
                ? [
                    {
                      name: capsuleSummary.title,
                      url: new URL(capsuleSummary.path, seoUrl).toString(),
                    },
                  ]
                : []),
              ...(bookNook
                ? [
                    {
                      name: BOOK_NOOK_PRODUCT_TYPE,
                      url: new URL(BOOK_NOOKS_PATH, seoUrl).toString(),
                    },
                  ]
                : []),
              {name: displayTitle, url: seoUrl},
            ],
          }),
        ]}
      />
      {selectedVariant ? (
        <Analytics.ProductView data={productViewAnalytics} />
      ) : null}
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/collections/all">Shop</Link>
        <span aria-hidden="true">›</span>
        {capsuleSummary ? (
          <>
            <Link to={capsuleSummary.path} prefetch="intent">
              {capsuleSummary.title}
            </Link>
            <span aria-hidden="true">›</span>
          </>
        ) : null}
        {bookNook ? (
          <>
            <Link to={BOOK_NOOKS_PATH} prefetch="intent">
              {BOOK_NOOK_PRODUCT_TYPE}
            </Link>
            <span aria-hidden="true">›</span>
          </>
        ) : null}
        <span>{displayTitle}</span>
      </nav>

      <section
        className={`product-detail-layout${
          isSkyMap ? ' product-detail-layout--sky' : ''
        }`}
      >
        {isNatal ? (
          <NatalConfigurator
            size={skySize}
            theme={skyTheme}
            onChange={setNatalParams}
          />
        ) : isSkyMap ? (
          <SkyConfigurator
            finish={skyFinish}
            initialTheme={skyTheme}
            onStatus={setSkyStatus}
            size={skySize}
          />
        ) : (
          <ProductGalleryCarousel
            key={`${product.id}:${printSize.key}`}
            images={galleryImages}
            isArtPrint={isArtPrint}
            printSize={printSize}
            productTitle={displayTitle}
          />
        )}

        <div className="product-purchase-panel">
          <div className="product-purchase-intro" ref={skyIntroRef}>
            <p className="eyebrow">
              {bookNook
                ? `Book nook${bookNookTheme ? ` · ${bookNookTheme.title}` : ''}`
                : product.productType ||
                  getVendorLabel(product.vendor) ||
                  'Curated object'}
            </p>
            <h1>{displayTitle}</h1>
            <p className="product-lede">{productLede}</p>
            {selectedVariant ? (
              <ProductPrice
                price={selectedVariant.price}
                compareAtPrice={selectedVariant.compareAtPrice}
              />
            ) : null}

            <div
              className="product-availability-row"
              aria-label="Purchase status"
            >
              <span
                className={`product-availability-chip ${
                  selectedVariant?.availableForSale
                    ? 'is-available'
                    : 'is-unavailable'
                }`}
              >
                {selectedVariant?.availableForSale
                  ? curatedProduct
                    ? 'DIY kit'
                    : 'Made to order'
                  : 'Unavailable'}
              </span>
              <span>
                {curatedProduct
                  ? curatedProduct.processing
                    ? `Processing ${curatedProduct.processing}`
                    : 'Processing estimate at checkout'
                  : `Processes in ${PRODUCTION_WINDOW_BUSINESS_DAYS} business days`}
              </span>
              {curatedProduct ? (
                <span>
                  Delivery included{' '}
                  {deliveryIncludedPhrase(
                    curatedProduct.verifiedDeliveryCountries,
                    curatedProduct.deliversWorldwide,
                  )}
                </span>
              ) : null}
              <span>{RETURN_WINDOW_DAYS}-day returns</span>
            </div>

            {kitSpecRows.length > 0 ? (
              <dl className="product-kit-specs" aria-label="Kit at a glance">
                {kitSpecRows.map((row) => (
                  <div key={row.label}>
                    <dt>{row.label}</dt>
                    <dd>{row.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>

          {isSkyMap ? (
            <section
              aria-labelledby="sky-options-heading"
              className="sky-product-options-stage"
            >
              <p className="sky-stage-heading" id="sky-options-heading">
                <span>2</span> Size and finish
              </p>
              <VariantOptions
                product={product}
                selectedVariant={selectedVariant}
              />
            </section>
          ) : (
            <VariantOptions
              product={product}
              selectedVariant={selectedVariant}
            />
          )}

          {classicFrameCrossSell ? (
            <aside
              className="product-format-choice"
              aria-label={`${classicFrameCrossSell.sizeLabel} frame option`}
            >
              <img
                src={classicFrameCrossSell.image.url}
                alt={
                  classicFrameCrossSell.image.altText ||
                  `Natural classic frame only, ${classicFrameCrossSell.sizeLabel}; artwork not included`
                }
                loading="lazy"
              />
              <div className="product-format-choice-copy">
                <p className="eyebrow">
                  Frame for this size ·{' '}
                  {formatMoney(classicFrameCrossSell.price)}
                </p>
                <p className="product-format-choice-title">
                  Add the matching Natural classic frame separately.
                </p>
                <p className="product-format-choice-detail">
                  Sized for the {classicFrameCrossSell.sizeLabel} print, with
                  clear Perspex glazing and a removable back. Frame only;
                  artwork is not included.
                </p>
                <Link
                  className="primary-button product-format-choice-cta"
                  to={classicFrameCrossSell.url}
                  prefetch="intent"
                >
                  View frame
                </Link>
              </div>
            </aside>
          ) : null}

          {isClassicFrame && selectedFrameSize ? (
            <aside
              className="product-format-choice product-format-choice--unframed"
              aria-label={`Art prints for the ${selectedFrameSize} frame`}
            >
              <img
                src="/images/product-art/quiet-form/quiet-form-01.webp"
                alt="Quiet Form I art print shown unframed"
                loading="lazy"
              />
              <div className="product-format-choice-copy">
                <p className="eyebrow">Frame only</p>
                <p className="product-format-choice-title">
                  Artwork is not included with this product.
                </p>
                <p className="product-format-choice-detail">
                  Choose a separate {selectedFrameSize} print for a matching
                  fit, or use the frame with artwork you already own.
                </p>
                <Link
                  className="text-link"
                  to={`/collections/all?type=Art+Prints`}
                  prefetch="intent"
                >
                  Shop art prints
                </Link>
              </div>
            </aside>
          ) : null}

          {isSkyMap && skyParams ? (
            <section
              className="sky-review"
              aria-labelledby="sky-review-heading"
            >
              <p className="sky-stage-heading" id="sky-review-heading">
                <span>3</span> Review and buy
              </p>
              <dl>
                <div>
                  <dt>Style</dt>
                  <dd>{SKY_THEME_LABELS[skyParams.theme]}</dd>
                </div>
                {skyParams.title ? (
                  <div>
                    <dt>Title</dt>
                    <dd>{skyParams.title}</dd>
                  </div>
                ) : null}
                <div>
                  <dt>Place</dt>
                  <dd>{skyParams.place}</dd>
                </div>
                <div>
                  <dt>Date</dt>
                  <dd>{formatSkyDate(skyParams)}</dd>
                </div>
                <div>
                  <dt>Size</dt>
                  <dd>{SKY_SIZES[skySize].label}</dd>
                </div>
                <div>
                  <dt>Finish</dt>
                  <dd>{SKY_FINISH_LABELS[skyFinish]}</dd>
                </div>
                {selectedVariantPrice ? (
                  <div>
                    <dt>Price</dt>
                    <dd>{selectedVariantPrice}</dd>
                  </div>
                ) : null}
              </dl>
              <p>
                We print exactly this artwork. Screen colour and natural wood
                grain can vary slightly.
              </p>
            </section>
          ) : null}

          <div className="product-buy-box">
            <div className="quantity-row">
              <span>Quantity</span>
              <div className="quantity-control" aria-label="Product quantity">
                <button
                  type="button"
                  onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                  aria-label="Decrease quantity"
                  disabled={quantity <= 1}
                >
                  <span aria-hidden>&#8722;</span>
                </button>
                <output aria-live="polite" aria-label={`Quantity ${quantity}`}>
                  {quantity}
                </output>
                <button
                  type="button"
                  onClick={() =>
                    setQuantity((value) => Math.min(99, value + 1))
                  }
                  aria-label="Increase quantity"
                  disabled={quantity >= 99}
                >
                  <span aria-hidden>&#43;</span>
                </button>
              </div>
            </div>

            <div ref={atcRef}>
              {isSkyMap && !skyParams ? (
                <a
                  className="primary-button full-width"
                  href={skyPendingAction.href}
                >
                  {skyPendingAction.label}
                </a>
              ) : (
                <AddToCartButton
                  analytics={addToCartAnalytics}
                  className="primary-button full-width"
                  disabled={purchaseBlocked}
                  lines={
                    selectedVariant
                      ? [
                          {
                            merchandiseId: selectedVariant.id,
                            quantity,
                            selectedVariant,
                            ...(skyAttributes
                              ? {attributes: skyAttributes}
                              : {}),
                          },
                        ]
                      : []
                  }
                  onSuccess={openCart}
                  pendingChildren="Adding..."
                >
                  {purchaseButtonLabel}
                </AddToCartButton>
              )}
            </div>

            {!isSkyMap &&
            !isNatal &&
            selectedVariant?.availableForSale &&
            shopPayStoreUrl ? (
              <div
                className="shop-pay-accelerator"
                aria-label="Express checkout with Shop Pay"
              >
                <ShopPayButton
                  storeDomain={shopPayStoreUrl}
                  variantIdsAndQuantities={[{id: selectedVariant.id, quantity}]}
                  width="100%"
                />
              </div>
            ) : null}
          </div>

          <ul className="product-assurance-list" aria-label="Order reassurance">
            <li>
              <span aria-hidden />
              {isLetterPost
                ? 'Sent by letter post — untracked, typically 5–8 business days.'
                : isPlantPot
                  ? 'Sent from the UK by untracked post.'
                  : 'Tracking details are emailed after dispatch.'}
            </li>
            <li>
              <span aria-hidden />
              Support responds within one business day.
            </li>
          </ul>

          <div className="product-details-list">
            {isPlantPot ? (
              <>
                <ProductDetail label="Pot" defaultOpen>
                  Glossy ceramic, 9 cm diameter x 10.2 cm high, with a drainage
                  hole and white rim and interior.
                </ProductDetail>
                <ProductDetail label="Included" defaultOpen>
                  One pot. Plant and saucer not included. Images are design
                  mockups; printed colours may vary.
                </ProductDetail>
              </>
            ) : null}
            {curatedProduct ? (
              <ProductDetail label="Kit" defaultOpen>
                {curatedProduct.details}
              </ProductDetail>
            ) : null}
            {isArtPrint ? (
              <ProductDetail label="Print" defaultOpen>
                Giclée print in archival pigment inks on 200gsm Enhanced Matte
                Art paper. {printSizeAvailabilityCopy(product.variants.nodes)}{' '}
                Ships unframed in the selected size; frame not included. Screen
                and print colours can vary slightly.
              </ProductDetail>
            ) : null}
            {isClassicFrame ? (
              <>
                <ProductDetail label="Frame" defaultOpen>
                  Natural classic picture frame in satin-laminated solid wood,
                  with a 20 mm face, shatterproof clear Perspex glazing, and a
                  removable flat backloader.
                </ProductDetail>
                <ProductDetail label="Size">
                  Choose {CLASSIC_FRAME_SIZE_LABELS.join(', ')} to match the
                  three available print sizes. The selected size is the artwork
                  opening.
                </ProductDetail>
                <ProductDetail label="Included" defaultOpen>
                  Frame, Perspex glazing, backing, and wall hanger only. Print,
                  artwork, and decorative mat are not included.
                </ProductDetail>
              </>
            ) : null}
            {capsuleSummary?.blurb ? (
              <ProductDetail label="Capsule">
                {capsuleSummary.blurb}{' '}
                <Link
                  className="text-link"
                  to={capsuleSummary.path}
                  prefetch="intent"
                >
                  Explore {capsuleSummary.title}
                </Link>
              </ProductDetail>
            ) : null}
            {memberWallSets.length > 0 ? (
              <ProductDetail label="Gallery wall">
                This print hangs in{' '}
                {memberWallSets.map((wallSet, index) => (
                  <span key={wallSet.slug}>
                    {index > 0 ? ' and ' : ''}
                    <Link
                      className="text-link"
                      to={`/collections/${wallSet.slug}`}
                      prefetch="intent"
                    >
                      {wallSet.name}
                    </Link>
                  </span>
                ))}
                {' — buy the complete three-print wall in one size.'}
              </ProductDetail>
            ) : null}
            {isPhoneCase ? (
              <>
                <ProductDetail label="Case" defaultOpen>
                  Slim snap case in impact-resistant polycarbonate with an
                  all-over matte print of the original artwork. Printed to
                  order; screen and print colours can vary slightly.
                </ProductDetail>
                <ProductDetail label="Fit" defaultOpen>
                  Made for {formatPhoneCaseDeviceList()} only. Cases are cut per
                  device and printed to order, so check your exact model before
                  ordering.
                </ProductDetail>
              </>
            ) : null}
            {isSkyMap ? (
              <>
                <ProductDetail label="Print" defaultOpen>
                  Giclée print in archival pigment inks on 200gsm Enhanced Matte
                  Art paper, made to order at {SKY_SIZES[skySize].label}. Framed
                  editions come in a solid wood classic frame with clear acrylic
                  glazing, delivered ready to hang.
                </ProductDetail>
                <ProductDetail label="Accuracy">
                  Every star brighter than the naked-eye limit, the Moon at its
                  true phase and place, and the visible planets — calculated for
                  your exact place and moment. Star data: Yale Bright Star
                  Catalogue; places: GeoNames (CC BY 4.0).
                </ProductDetail>
                <ProductDetail label="Personalisation">
                  Your title, the place, the date and its coordinates are set in
                  the lower band. We print exactly what the preview shows, so
                  check the spelling before you add to cart.
                </ProductDetail>
              </>
            ) : null}
            {isNatal ? (
              <>
                <ProductDetail label="Print" defaultOpen>
                  Giclée print in archival pigment inks on 200gsm Enhanced Matte
                  Art paper, made to order at {SKY_SIZES[skySize].label}. Framed
                  editions come in a solid wood classic frame with clear acrylic
                  glazing, delivered ready to hang.
                </ProductDetail>
                <ProductDetail label="The medallion">
                  A star chart of the sky over the birthplace at the moment of
                  birth — every naked-eye star, the Moon at its true phase and
                  the visible planets. Leave the time blank and the chart is
                  drawn for midday, with no time printed. Star data: Yale Bright
                  Star Catalogue; places: GeoNames (CC BY 4.0).
                </ProductDetail>
                <ProductDetail label="Personalisation">
                  The name, the birth date, the place with its coordinates, and
                  an optional line in your words — weight, length, a welcome. We
                  print exactly what the preview shows, so check the spelling
                  before you add to cart.
                </ProductDetail>
              </>
            ) : null}
            {isBlanket ? (
              <ProductDetail label="Blanket" defaultOpen>
                Single-sided premium polyester fleece, hemmed at 30 × 40 in with
                the artwork printed across the full face. Printed to order;
                screen and print colours can vary slightly.
              </ProductDetail>
            ) : null}
            <ProductDetail label="Shipping">
              <ProductShippingText
                curatedShipping={curatedProduct?.shipping}
                isPlantPot={isPlantPot}
                reach={shippingReach}
                dispatchWindow={DISPATCH_WINDOW_BUSINESS_DAYS}
                deliveryWindow={DELIVERY_EU_BUSINESS_DAYS}
                internationalDeliveryWindow={
                  DELIVERY_INTERNATIONAL_BUSINESS_DAYS
                }
              />
            </ProductDetail>
            <ProductDetail label="Returns">
              {RETURN_WINDOW_DAYS}-day return window from delivery. Items must
              be unused and in original packaging.{' '}
              <Link to="/policies/refund-policy" className="text-link">
                Full policy
              </Link>
            </ProductDetail>
            <ProductDetail label="Support">
              Questions before or after your purchase? We respond within one
              business day.{' '}
              <Link to="/contact" className="text-link">
                Get in touch
              </Link>
            </ProductDetail>
          </div>

          {phoneCaseCrossSell ? (
            <aside
              className="product-cross-sell"
              aria-label="Also available as a phone case"
            >
              {phoneCaseCrossSell.image ? (
                <img
                  src={phoneCaseCrossSell.image.url}
                  alt={
                    phoneCaseCrossSell.image.altText ||
                    `${phoneCaseCrossSell.capsuleTitle} snap phone case`
                  }
                  loading="lazy"
                />
              ) : null}
              <div className="product-cross-sell-copy">
                <p className="eyebrow">Also available</p>
                <p className="product-cross-sell-title">
                  {phoneCaseCrossSell.capsuleTitle} artwork on a slim snap phone
                  case
                  {phoneCaseCrossSell.price
                    ? ` — ${formatMoney(phoneCaseCrossSell.price)}`
                    : ''}
                </p>
                <Link
                  className="text-link"
                  to={phoneCaseCrossSell.url}
                  prefetch="intent"
                >
                  View the case
                </Link>
              </div>
            </aside>
          ) : null}

          {toughCaseCrossSell ? (
            <aside
              className="product-cross-sell"
              aria-label="Also available as a phone case"
            >
              {toughCaseCrossSell.image ? (
                <img
                  src={toughCaseCrossSell.image.url}
                  alt={
                    toughCaseCrossSell.image.altText ||
                    `${toughCaseCrossSell.artworkTitle} on a tough phone case`
                  }
                  loading="lazy"
                />
              ) : null}
              <div className="product-cross-sell-copy">
                <p className="eyebrow">Also available</p>
                <p className="product-cross-sell-title">
                  {toughCaseCrossSell.artworkTitle} on a matte tough phone case
                  for iPhone, Galaxy and Pixel
                  {toughCaseCrossSell.price
                    ? ` — ${formatMoney(toughCaseCrossSell.price)}`
                    : ''}
                </p>
                <Link
                  className="text-link"
                  to={toughCaseCrossSell.url}
                  prefetch="intent"
                >
                  View the case
                </Link>
              </div>
            </aside>
          ) : null}
        </div>
      </section>

      <ReviewsSection
        productGid={product.id}
        productTitle={displayTitle}
        data={reviews}
      />

      {relatedProducts.length > 0 ? (
        <section className="related-section" aria-labelledby="related">
          <div className="section-heading-row">
            <div>
              <p className="eyebrow">
                {relatedFromBookNooks
                  ? 'Book nooks'
                  : relatedFromCapsule
                    ? 'From the same capsule'
                    : 'Also in the catalog'}
              </p>
              <h2 id="related">
                {relatedFromBookNooks ? 'More small worlds' : 'Pair with'}
              </h2>
            </div>
            {capsuleSummary ? (
              <Link
                className="text-link"
                to={capsuleSummary.path}
                prefetch="intent"
              >
                View {capsuleSummary.title}
              </Link>
            ) : bookNook ? (
              <Link
                className="text-link"
                to={BOOK_NOOKS_PATH}
                prefetch="intent"
              >
                All book nooks
              </Link>
            ) : null}
          </div>
          <div className="product-grid compact-grid">
            {relatedProducts.slice(0, 3).map((relatedProduct) => (
              <ClaraProductCard
                key={relatedProduct.id}
                product={relatedProduct}
              />
            ))}
          </div>
        </section>
      ) : null}

      <RecentlyViewed excludeHandles={[product.handle]} />

      {/* While hidden the bar is inert, so keyboard and screen-reader users
          never land on an invisible purchase button. */}
      <div
        aria-hidden={showStickyATC ? undefined : true}
        aria-label="Quick purchase"
        className={`sticky-atc-bar ${showStickyATC ? 'is-visible' : ''}`}
        role="region"
        {...(showStickyATC ? {} : {inert: ''})}
      >
        <div className="sticky-atc-info">
          {stickyThumb ? (
            <img
              className="sticky-atc-thumb"
              src={stickyThumbUrl}
              alt=""
              aria-hidden="true"
              decoding="async"
              height={88}
              width={88}
            />
          ) : null}
          <div>
            <p className="sticky-atc-title">{displayTitle}</p>
            {selectedVariant ? (
              <p className="sticky-atc-price">
                {stickyOptions ? (
                  <span className="sticky-atc-options">{stickyOptions}</span>
                ) : null}
                {formatMoney(selectedVariant.price)}
              </p>
            ) : null}
          </div>
        </div>
        {isSkyMap && !skyParams ? (
          <a
            className="primary-button sticky-atc-button"
            href={skyPendingAction.href}
          >
            {skyPendingAction.label}
          </a>
        ) : (
          <AddToCartButton
            analytics={addToCartAnalytics}
            className="primary-button sticky-atc-button"
            disabled={purchaseBlocked}
            lines={
              selectedVariant
                ? [
                    {
                      merchandiseId: selectedVariant.id,
                      quantity,
                      selectedVariant,
                      ...(skyAttributes ? {attributes: skyAttributes} : {}),
                    },
                  ]
                : []
            }
            onSuccess={openCart}
            pendingChildren="Adding…"
          >
            {stickyButtonLabel}
          </AddToCartButton>
        )}
      </div>
    </div>
  );
}

function ProductGalleryCarousel({
  images,
  isArtPrint,
  printSize,
  productTitle,
}: {
  images: ProductImage[];
  isArtPrint: boolean;
  printSize: {key: PrintSizeKey; label: string};
  productTitle: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [zoomIndex, setZoomIndex] = useState<number | null>(null);
  const zoomOverlayRef = useRef<HTMLDivElement>(null);
  const galleryTrackRef = useRef<HTMLDivElement>(null);
  const galleryScrollFrameRef = useRef<number | null>(null);
  const zoomCloseRef = useRef<HTMLButtonElement>(null);
  const zoomTriggerRef = useRef<HTMLButtonElement | null>(null);
  const zoomPointerRef = useRef<{id: number; x: number; y: number} | null>(
    null,
  );
  const slideCount = images.length + (isArtPrint ? 1 : 0);
  const zoomCount = images.length;
  const zoomImage = zoomIndex != null ? (images[zoomIndex] ?? null) : null;
  const zoomOpen = zoomIndex != null;
  const galleryIdentity = `${printSize.key}:${images
    .map((image) => image.url)
    .join('|')}`;

  const closeZoom = useCallback(() => {
    if (zoomIndex != null) {
      const track = galleryTrackRef.current;
      const slide = track?.querySelectorAll<HTMLElement>(
        '[data-product-gallery-slide]',
      )[zoomIndex];
      if (track && slide) {
        setActiveIndex(zoomIndex);
        track.scrollTo({behavior: 'auto', left: slide.offsetLeft});
      }
      const trigger = slide?.querySelector<HTMLElement>(
        '.product-zoom-trigger',
      );
      window.requestAnimationFrame(() =>
        (trigger ?? zoomTriggerRef.current)?.focus(),
      );
    }
    setZoomIndex(null);
  }, [zoomIndex]);

  const navigateZoom = useCallback(
    (delta: number) => {
      setZoomIndex((current) =>
        current == null
          ? current
          : cycleCarouselIndex(current, delta, zoomCount),
      );
    },
    [zoomCount],
  );

  const scrollToSlide = useCallback(
    (index: number) => {
      const track = galleryTrackRef.current;
      if (!track) return;

      const slides = Array.from(
        track.querySelectorAll<HTMLElement>('[data-product-gallery-slide]'),
      );
      const nextIndex = clampCarouselIndex(index, slideCount);
      const slide = slides[nextIndex];
      if (!slide) return;

      const prefersReducedMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches;
      setActiveIndex(nextIndex);
      track.scrollTo({
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
        left: slide.offsetLeft,
      });
    },
    [slideCount],
  );

  const handleGalleryScroll = useCallback(() => {
    const track = galleryTrackRef.current;
    if (!track) return;

    if (galleryScrollFrameRef.current !== null) {
      window.cancelAnimationFrame(galleryScrollFrameRef.current);
    }
    galleryScrollFrameRef.current = window.requestAnimationFrame(() => {
      const slides = Array.from(
        track.querySelectorAll<HTMLElement>('[data-product-gallery-slide]'),
      );
      setActiveIndex(
        nearestCarouselIndex(
          slides.map((slide) => slide.offsetLeft),
          track.scrollLeft,
        ),
      );
      galleryScrollFrameRef.current = null;
    });
  }, []);

  const handleGalleryKeyDown = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
  ) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      scrollToSlide(activeIndex - 1);
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      scrollToSlide(activeIndex + 1);
    }
  };

  useEffect(() => {
    setActiveIndex(0);
    setZoomIndex(null);
    galleryTrackRef.current?.scrollTo({behavior: 'auto', left: 0});
  }, [galleryIdentity]);

  useEffect(
    () => () => {
      if (galleryScrollFrameRef.current !== null) {
        window.cancelAnimationFrame(galleryScrollFrameRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (!zoomOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    zoomCloseRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [zoomOpen]);

  useEffect(() => {
    if (!zoomOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeZoom();
      if (event.key === 'Tab' && zoomOverlayRef.current)
        keepTabInside(event, zoomOverlayRef.current);
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        navigateZoom(-1);
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        navigateZoom(1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [closeZoom, navigateZoom, zoomOpen]);

  const handleZoomPointerDown = (
    event: ReactPointerEvent<HTMLImageElement>,
  ) => {
    zoomPointerRef.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
  };

  const handleZoomPointerUp = (event: ReactPointerEvent<HTMLImageElement>) => {
    const start = zoomPointerRef.current;
    zoomPointerRef.current = null;
    if (!start || start.id !== event.pointerId) return;

    const step = resolveZoomSwipe({
      deltaX: event.clientX - start.x,
      deltaY: event.clientY - start.y,
    });
    if (step !== 0) navigateZoom(step);
  };

  const handleZoomPointerCancel = () => {
    zoomPointerRef.current = null;
  };

  if (slideCount === 0) {
    return (
      <div className="product-gallery product-gallery--carousel">
        <div className="product-image-placeholder" aria-hidden />
      </div>
    );
  }

  return (
    <>
      <div
        className="product-gallery product-gallery--carousel"
        role="region"
        aria-roledescription="carousel"
        aria-label={`${productTitle} product gallery${
          isArtPrint ? `, ${printSize.label} selected` : ''
        }`}
      >
        <div className="product-gallery-frame">
          <div
            className="product-gallery-track"
            ref={galleryTrackRef}
            onScroll={handleGalleryScroll}
          >
            {images.map((image, index) => (
              <div
                className="product-gallery-slide"
                data-product-gallery-slide
                key={image.url}
                role="group"
                aria-roledescription="slide"
                aria-label={`${index + 1} of ${slideCount}`}
              >
                <button
                  className="product-zoom-trigger"
                  type="button"
                  tabIndex={index === activeIndex ? 0 : -1}
                  aria-haspopup="dialog"
                  aria-label={`View detail: image ${index + 1} of ${slideCount}, enlarged`}
                  onKeyDown={handleGalleryKeyDown}
                  onClick={(event) => {
                    zoomTriggerRef.current = event.currentTarget;
                    setZoomIndex(index);
                  }}
                >
                  <Image
                    aspectRatio="4/5"
                    data={image}
                    alt={image.altText || `${productTitle} view ${index + 1}`}
                    loading={index === 0 ? 'eager' : 'lazy'}
                    sizes="(min-width: 981px) min(51vw, 760px), calc(100vw - 32px)"
                  />
                  <span className="product-zoom-hint">View detail</span>
                </button>
              </div>
            ))}
            {isArtPrint ? (
              <div
                className="product-gallery-slide product-gallery-slide--scale"
                data-product-gallery-slide
                role="group"
                aria-roledescription="slide"
                aria-label={`${slideCount} of ${slideCount}, print scale diagram`}
              >
                <PrintScaleDiagram size={printSize.key} />
              </div>
            ) : null}
          </div>

          {slideCount > 1 ? (
            <>
              <button
                className="product-gallery-arrow product-gallery-arrow--previous"
                type="button"
                disabled={activeIndex === 0}
                aria-label="Previous gallery slide"
                onKeyDown={handleGalleryKeyDown}
                onClick={() => scrollToSlide(activeIndex - 1)}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M14.5 5.5 8 12l6.5 6.5M8.5 12H20" />
                </svg>
              </button>
              <button
                className="product-gallery-arrow product-gallery-arrow--next"
                type="button"
                disabled={activeIndex === slideCount - 1}
                aria-label="Next gallery slide"
                onKeyDown={handleGalleryKeyDown}
                onClick={() => scrollToSlide(activeIndex + 1)}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m9.5 5.5 6.5 6.5-6.5 6.5M15.5 12H4" />
                </svg>
              </button>
            </>
          ) : null}
        </div>

        {slideCount > 1 ? (
          <div className="product-gallery-navigation">
            <p
              className="product-gallery-counter"
              aria-live="polite"
              aria-atomic="true"
            >
              <span className="sr-only">
                Slide {activeIndex + 1} of {slideCount}
              </span>
              <span aria-hidden="true">
                {String(activeIndex + 1).padStart(2, '0')}
                <i>/</i>
                {String(slideCount).padStart(2, '0')}
              </span>
            </p>
            <div className="product-gallery-dots" aria-label="Gallery slides">
              {Array.from({length: slideCount}, (_, index) => (
                <button
                  className={`product-gallery-dot ${
                    index === activeIndex ? 'is-active' : ''
                  }`}
                  type="button"
                  key={index}
                  aria-current={index === activeIndex ? 'true' : undefined}
                  aria-label={
                    isArtPrint && index === slideCount - 1
                      ? 'View print scale diagram'
                      : `View image ${index + 1}`
                  }
                  onKeyDown={handleGalleryKeyDown}
                  onClick={() => scrollToSlide(index)}
                />
              ))}
            </div>
            {isArtPrint ? (
              <p className="product-gallery-size">
                Selected size <span>{printSize.label}</span>
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      {zoomImage ? (
        <div
          className="product-zoom-overlay"
          ref={zoomOverlayRef}
          role="dialog"
          aria-modal="true"
          aria-label={`${productTitle} enlarged view`}
        >
          <button
            className="product-zoom-backdrop"
            type="button"
            aria-label="Close enlarged view"
            onClick={closeZoom}
          />
          <img
            src={zoomImage.url}
            alt={zoomImage.altText || productTitle}
            draggable={false}
            onPointerDown={handleZoomPointerDown}
            onPointerUp={handleZoomPointerUp}
            onPointerCancel={handleZoomPointerCancel}
          />
          {zoomCount > 1 ? (
            <>
              <button
                className="product-zoom-nav product-zoom-nav--previous"
                type="button"
                aria-label="Previous photo"
                onClick={() => navigateZoom(-1)}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M14.5 5.5 8 12l6.5 6.5M8.5 12H20" />
                </svg>
              </button>
              <button
                className="product-zoom-nav product-zoom-nav--next"
                type="button"
                aria-label="Next photo"
                onClick={() => navigateZoom(1)}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m9.5 5.5 6.5 6.5-6.5 6.5M15.5 12H4" />
                </svg>
              </button>
              <p
                className="product-zoom-counter"
                aria-live="polite"
                aria-atomic="true"
              >
                <span className="sr-only">
                  Photo {(zoomIndex ?? 0) + 1} of {zoomCount}
                </span>
                <span aria-hidden="true">
                  {String((zoomIndex ?? 0) + 1).padStart(2, '0')}
                  <i>/</i>
                  {String(zoomCount).padStart(2, '0')}
                </span>
              </p>
            </>
          ) : null}
          <button
            className="product-zoom-close"
            type="button"
            ref={zoomCloseRef}
            onClick={closeZoom}
          >
            Close
          </button>
        </div>
      ) : null}
    </>
  );
}

/**
 * The selected print at true proportion above the same 84 in sofa reference.
 */
function PrintScaleDiagram({size}: {size: PrintSizeKey}) {
  const geometry = printScaleGeometry(size);
  const left = 280 - geometry.width / 2;
  const top = 107 - geometry.height;
  const guideY = top - 14;
  const guideX = left + geometry.width + 14;

  return (
    <figure className="product-scale">
      <svg
        viewBox="0 0 560 300"
        role="img"
        aria-label={`Scale diagram: an unframed ${geometry.widthInches} by ${geometry.heightInches} inch portrait print shown at true proportion on a wall above a standard 84 inch sofa.`}
      >
        <g stroke="currentColor" strokeWidth="1.4" fill="none">
          {/* floor */}
          <line x1="40" y1="262" x2="520" y2="262" strokeOpacity="0.55" />
          {/* sofa: back, seat, arms, legs (84 in wide, ~30 in tall) */}
          <g strokeOpacity="0.55">
            <rect x="133" y="157" width="294" height="60" rx="10" />
            <rect x="121" y="187" width="318" height="44" rx="12" />
            <line x1="133" y1="231" x2="133" y2="262" />
            <line x1="427" y1="231" x2="427" y2="262" />
          </g>
          {/* selected portrait print, hung above the sofa */}
          <rect
            x={left}
            y={top}
            width={geometry.width}
            height={geometry.height}
            fill="var(--color-paper, #fbfaf6)"
          />
          {/* dimension guides */}
          <g strokeOpacity="0.4" strokeDasharray="3 4">
            <line
              x1={left}
              y1={guideY}
              x2={left + geometry.width}
              y2={guideY}
            />
            <line x1={guideX} y1={top} x2={guideX} y2={top + geometry.height} />
          </g>
        </g>
        <g
          fill="currentColor"
          fontFamily="Inter, ui-sans-serif, system-ui, sans-serif"
          fontSize="11"
        >
          <text x="280" y={guideY - 8} textAnchor="middle">
            {geometry.widthInches} in
          </text>
          <text x={guideX + 8} y={top + geometry.height / 2 + 4}>
            {geometry.heightInches} in
          </text>
          <text x="280" y="284" textAnchor="middle" fillOpacity="0.6">
            84 in sofa, for scale
          </text>
        </g>
      </svg>
      <figcaption>
        True to size: an unframed {geometry.label} ({geometry.centimeters})
        portrait print, shown to scale above a standard 84 in sofa. Hang it
        solo, or pair it with its capsule companions.
      </figcaption>
    </figure>
  );
}

function getVendorLabel(vendor?: string | null) {
  if (!vendor) return null;
  if (vendor.toLowerCase().includes('mock')) return null;
  return vendor;
}

function getStoreUrl(storeDomain: string) {
  return /^https?:\/\//i.test(storeDomain)
    ? storeDomain
    : `https://${storeDomain}`;
}

const PRODUCT_QUERY = `#graphql
  query Product(
    $capsuleQuery: String!
    $classicFrameHandle: String!
    $country: CountryCode
    $first: Int!
    $handle: String!
    $language: LanguageCode
    $phoneCaseHandle: String!
    $selectedOptions: [SelectedOptionInput!]!
    $toughCaseHandle: String!
  ) @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      ...ClaraProductCard
      description
      descriptionHtml
      galleryImages: images(first: 10) {
        nodes {
          altText
          height
          url
          width
        }
      }
      options {
        id
        name
        optionValues {
          id
          name
        }
      }
      selectedOrFirstAvailableVariant(
        selectedOptions: $selectedOptions
        ignoreUnknownOptions: true
        caseInsensitiveMatch: true
      ) {
        ...ClaraProductVariant
      }
      variants(first: 100) {
        nodes {
          ...ClaraProductVariant
        }
      }
      reviewsMetafield: metafield(namespace: "custom", key: "reviews") {
        references(first: 50) {
          nodes {
            ... on Metaobject {
              id
              fields {
                key
                value
                references(first: 3) {
                  nodes {
                    ... on MediaImage {
                      image {
                        url
                        altText
                        width
                        height
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    relatedProducts: products(first: $first, sortKey: BEST_SELLING) {
      nodes {
        ...ClaraProductCard
      }
    }
    capsuleProducts: products(first: 3, query: $capsuleQuery) {
      nodes {
        ...ClaraProductCard
      }
    }
    classicFrame: product(handle: $classicFrameHandle) {
      ...ClaraProductCard
      frameVariants: variants(first: 5) {
        nodes {
          availableForSale
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
          selectedOptions {
            name
            value
          }
        }
      }
    }
    toughCase: product(handle: $toughCaseHandle) {
      ...ClaraProductCard
      caseOptions: options {
        name
        optionValues {
          name
          firstSelectableVariant {
            availableForSale
            image {
              url
              altText
              width
              height
            }
            price {
              amount
              currencyCode
            }
          }
        }
      }
    }
    phoneCase: product(handle: $phoneCaseHandle) {
      ...ClaraProductCard
      caseVariants: variants(first: 24) {
        nodes {
          availableForSale
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
          selectedOptions {
            name
            value
          }
        }
      }
    }
  }
  ${PRODUCT_CARD_FRAGMENT}
  ${PRODUCT_VARIANT_FRAGMENT}
` as const;
