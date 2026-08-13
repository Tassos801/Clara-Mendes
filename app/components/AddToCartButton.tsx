import {
  CartForm,
  useAnalytics,
  type OptimisticCartLineInput,
} from '@shopify/hydrogen';
import {useCallback, useEffect, useRef} from 'react';
import {getCartFormErrorMessages} from '~/lib/cartFormErrors';
import {
  getSerializedMarketingAttribution,
  MARKETING_ATTRIBUTION_INPUT_NAME,
} from '~/lib/marketingAttribution';

type CartFetcher = {
  data?: unknown;
  state: string;
};

export function AddToCartButton({
  analytics,
  ariaLabel,
  className,
  children,
  disabled,
  lines,
  onSuccess,
  pendingChildren,
  showErrors = true,
}: {
  analytics?: unknown;
  ariaLabel?: string;
  className?: string;
  children: React.ReactNode;
  disabled?: boolean;
  lines: Array<OptimisticCartLineInput>;
  onSuccess?: () => void;
  pendingChildren?: React.ReactNode;
  showErrors?: boolean;
}) {
  return (
    <CartForm route="/cart" inputs={{lines}} action={CartForm.ACTIONS.LinesAdd}>
      {(fetcher) => (
        <AddToCartButtonContent
          analytics={analytics}
          ariaLabel={ariaLabel}
          className={className}
          disabled={disabled}
          fetcher={fetcher}
          onSuccess={onSuccess}
          pendingChildren={pendingChildren}
          showErrors={showErrors}
        >
          {children}
        </AddToCartButtonContent>
      )}
    </CartForm>
  );
}

function AddToCartButtonContent({
  analytics,
  ariaLabel,
  children,
  className,
  disabled,
  fetcher,
  onSuccess,
  pendingChildren,
  showErrors,
}: {
  analytics?: unknown;
  ariaLabel?: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  fetcher: CartFetcher;
  onSuccess?: () => void;
  pendingChildren?: React.ReactNode;
  showErrors: boolean;
}) {
  const wasSubmitting = useRef(false);
  const attributionInputRef = useRef<HTMLInputElement>(null);
  const {canTrack} = useAnalytics();
  const errors = getCartFormErrorMessages(fetcher.data);
  const isBusy = fetcher.state !== 'idle';
  const refreshMarketingAttribution = useCallback(() => {
    if (attributionInputRef.current) {
      attributionInputRef.current.value = canTrack()
        ? getSerializedMarketingAttribution()
        : '';
    }
  }, [canTrack]);

  useEffect(() => {
    refreshMarketingAttribution();
  }, [refreshMarketingAttribution]);

  useEffect(() => {
    if (fetcher.state !== 'idle') {
      wasSubmitting.current = true;
      return;
    }

    if (!wasSubmitting.current || fetcher.data === undefined) return;

    wasSubmitting.current = false;

    if (getCartFormErrorMessages(fetcher.data).length === 0) {
      onSuccess?.();
    }
  }, [analytics, fetcher.data, fetcher.state, onSuccess]);

  return (
    <>
      <input name="analytics" type="hidden" value={JSON.stringify(analytics)} />
      <input
        name={MARKETING_ATTRIBUTION_INPUT_NAME}
        type="hidden"
        defaultValue=""
        ref={attributionInputRef}
      />
      <button
        aria-busy={isBusy}
        aria-label={ariaLabel}
        className={className}
        type="submit"
        disabled={disabled || isBusy}
        onClick={refreshMarketingAttribution}
        onPointerDown={refreshMarketingAttribution}
      >
        {isBusy && pendingChildren ? pendingChildren : children}
      </button>
      {showErrors && errors.length > 0 ? (
        <p className="cart-form-error" role="alert">
          {errors[0]}
        </p>
      ) : null}
    </>
  );
}
