import {useMemo, useState} from 'react';
import {Link, redirect, useLoaderData, useLocation} from 'react-router';
import {getSelectedProductOptions} from '@shopify/hydrogen';
import type {Route} from './+types/products.$handle';
import {AddToCartButton} from '~/components/AddToCartButton';
import {
  ClaraProductCard,
  type ClaraCardProduct,
} from '~/components/ClaraProductCard';
import {useAside} from '~/components/Aside';
import {filterDemoProducts, isDemoProduct} from '~/lib/catalogFilters';
import {PRODUCT_CARD_FRAGMENT} from '~/lib/productCardFragment';
import {getProductDescription} from '~/lib/productCopy';

type MoneyAmount = {
  amount: string;
  currencyCode: string;
};

type ProductImage = {
  altText?: string | null;
  url: string;
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
  price: MoneyAmount;
  compareAtPrice?: MoneyAmount | null;
  selectedOptions: SelectedOption[];
  image?: ProductImage | null;
  product: {
    handle: string;
    title: string;
  };
};

type ProductDetail = ClaraCardProduct & {
  description: string;
  descriptionHtml?: string;
  options: ProductOption[];
  selectedOrFirstAvailableVariant?: ProductVariant | null;
  variants: {
    nodes: ProductVariant[];
  };
};

export const meta: Route.MetaFunction = ({data}) => {
  const product = data?.product;
  const description = product ? getProductDescription(product) : null;

  return [
    {title: `Clara Mendes | ${product?.title ?? 'Product'}`},
    {
      name: 'description',
      content:
        description ||
        'Shop this Clara Mendes product through secure Shopify checkout.',
    },
  ];
};

export async function loader({context, params, request}: Route.LoaderArgs) {
  const selectedOptions = getSelectedProductOptions(request);
  const handle = params.handle;

  if (!handle) {
    throw new Response('Product handle is required', {status: 400});
  }

  const data = await context.storefront.query(PRODUCT_QUERY, {
    variables: {
      first: 4,
      handle,
      selectedOptions,
    },
  });

  if (!data.product) {
    throw new Response('Product not found', {status: 404});
  }

  if (isDemoProduct(data.product)) {
    throw redirect('/collections/all');
  }

  return {
    product: data.product as ProductDetail,
    relatedProducts: filterDemoProducts(
      data.relatedProducts.nodes as ClaraCardProduct[],
    ).filter((product) => product.handle !== handle),
  };
}

export default function Product() {
  const {product, relatedProducts} = useLoaderData<typeof loader>();
  const {open} = useAside();
  const [quantity, setQuantity] = useState(1);
  const selectedVariant =
    product.selectedOrFirstAvailableVariant ?? product.variants.nodes[0];
  const primaryImage =
    selectedVariant?.image ?? product.featuredImage ?? product.images?.nodes[0];
  const productDescription = getProductDescription(product);
  const galleryImages = useMemo(() => {
    const images = [
      ...(primaryImage ? [primaryImage] : []),
      ...(product.images?.nodes ?? []),
    ];

    return images.filter(
      (image, index, list) =>
        image?.url && list.findIndex((item) => item.url === image.url) === index,
    );
  }, [primaryImage, product.images?.nodes]);

  return (
    <div className="product-page">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/collections/all">Shop</Link>
        <span>/</span>
        <span>{product.title}</span>
      </nav>

      <section className="product-detail-layout">
        <div className="product-gallery">
          {galleryImages.length > 0 ? (
            galleryImages.map((image, index) => (
              <img
                key={image.url}
                src={image.url}
                alt={image.altText || `${product.title} ${index + 1}`}
                loading={index === 0 ? 'eager' : 'lazy'}
              />
            ))
          ) : (
            <div className="product-image-placeholder" aria-hidden />
          )}
        </div>

        <div className="product-purchase-panel">
          <p className="eyebrow">
            {product.productType ||
              getVendorLabel(product.vendor) ||
              'Curated object'}
          </p>
          <h1>{product.title}</h1>
          <p className="product-lede">{productDescription}</p>
          {selectedVariant ? (
            <ProductPrice
              price={selectedVariant.price}
              compareAtPrice={selectedVariant.compareAtPrice}
            />
          ) : null}

          <VariantOptions product={product} selectedVariant={selectedVariant} />

          <div className="quantity-row">
            <span>Quantity</span>
            <div className="quantity-control" aria-label="Product quantity">
              <button
                type="button"
                onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                aria-label="Decrease quantity"
              >
                -
              </button>
              <span>{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((value) => Math.min(99, value + 1))}
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
          </div>

          <AddToCartButton
            analytics={{
              products: [
                {
                  productGid: product.id,
                  variantGid: selectedVariant?.id,
                  name: product.title,
                  variantName: selectedVariant?.title,
                  price: selectedVariant?.price.amount,
                  quantity,
                },
              ],
            }}
            className="primary-button full-width"
            disabled={!selectedVariant?.availableForSale}
            lines={
              selectedVariant
                ? [
                    {
                      merchandiseId: selectedVariant.id,
                      quantity,
                      selectedVariant,
                    },
                  ]
                : []
            }
            onClick={() => open('cart')}
          >
            {selectedVariant?.availableForSale ? 'Add to cart' : 'Sold out'}
          </AddToCartButton>

          <dl className="product-details-list">
            <div>
              <dt>Fulfillment</dt>
              <dd>Prepared after order review with tracked delivery updates.</dd>
            </div>
            <div>
              <dt>Checkout</dt>
              <dd>Secure checkout with taxes and shipping confirmed before payment.</dd>
            </div>
          </dl>
        </div>
      </section>

      {relatedProducts.length > 0 ? (
        <section className="related-section" aria-labelledby="related">
          <div className="section-heading-row">
            <div>
              <p className="eyebrow">Also in the catalog</p>
              <h2 id="related">Pair with</h2>
            </div>
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
    </div>
  );
}

function ProductPrice({
  compareAtPrice,
  price,
}: {
  compareAtPrice?: MoneyAmount | null;
  price: MoneyAmount;
}) {
  return (
    <div className="product-price">
      {compareAtPrice ? (
        <span className="product-price-on-sale">
          {formatMoney(price)} <s>{formatMoney(compareAtPrice)}</s>
        </span>
      ) : (
        formatMoney(price)
      )}
    </div>
  );
}

function VariantOptions({
  product,
  selectedVariant,
}: {
  product: ProductDetail;
  selectedVariant?: ProductVariant | null;
}) {
  const location = useLocation();
  const selectedMap = new Map(
    selectedVariant?.selectedOptions.map((option) => [
      option.name,
      option.value,
    ]) ?? [],
  );

  if (!product.options.length || product.variants.nodes.length <= 1) {
    return null;
  }

  return (
    <div className="product-options">
      {product.options.map((option) => (
        <fieldset className="variant-fieldset" key={option.id || option.name}>
          <legend>{option.name}</legend>
          <div className="variant-options">
            {option.optionValues.map((value) => {
              const variant = findVariantForOption({
                optionName: option.name,
                optionValue: value.name,
                selectedMap,
                variants: product.variants.nodes,
              });
              const params = new URLSearchParams(location.search);
              const selected = selectedMap.get(option.name) === value.name;

              if (variant) {
                variant.selectedOptions.forEach((selectedOption) => {
                  params.set(selectedOption.name, selectedOption.value);
                });
              } else {
                params.set(option.name, value.name);
              }

              return (
                <Link
                  className={[
                    selected ? 'is-selected' : '',
                    variant?.availableForSale === false ? 'is-unavailable' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  key={value.id || value.name}
                  preventScrollReset
                  replace
                  to={`/products/${product.handle}?${params.toString()}`}
                >
                  {value.name}
                </Link>
              );
            })}
          </div>
        </fieldset>
      ))}
    </div>
  );
}

function findVariantForOption({
  optionName,
  optionValue,
  selectedMap,
  variants,
}: {
  optionName: string;
  optionValue: string;
  selectedMap: Map<string, string>;
  variants: ProductVariant[];
}) {
  return (
    variants.find((variant) =>
      variant.selectedOptions.every((option) => {
        if (option.name === optionName) return option.value === optionValue;
        const selected = selectedMap.get(option.name);
        return selected ? option.value === selected : true;
      }),
    ) ??
    variants.find((variant) =>
      variant.selectedOptions.some(
        (option) => option.name === optionName && option.value === optionValue,
      ),
    )
  );
}

function formatMoney(price: MoneyAmount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: price.currencyCode,
  }).format(Number(price.amount));
}

function getVendorLabel(vendor?: string | null) {
  if (!vendor) return null;
  if (vendor.toLowerCase().includes('mock')) return null;
  return vendor;
}

const PRODUCT_VARIANT_FRAGMENT = `#graphql
  fragment ClaraProductVariant on ProductVariant {
    id
    title
    availableForSale
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
  }
` as const;

const PRODUCT_QUERY = `#graphql
  query Product(
    $country: CountryCode
    $first: Int!
    $handle: String!
    $language: LanguageCode
    $selectedOptions: [SelectedOptionInput!]!
  ) @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      ...ClaraProductCard
      description
      descriptionHtml
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
    }
    relatedProducts: products(first: $first, sortKey: BEST_SELLING) {
      nodes {
        ...ClaraProductCard
      }
    }
  }
  ${PRODUCT_CARD_FRAGMENT}
  ${PRODUCT_VARIANT_FRAGMENT}
` as const;
