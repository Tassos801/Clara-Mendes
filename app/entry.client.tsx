import {HydratedRouter} from 'react-router/dom';
import {startTransition, StrictMode} from 'react';
import {hydrateRoot} from 'react-dom/client';
import {NonceProvider} from '@shopify/hydrogen';

if (!window.location.origin.includes('webcache.googleusercontent.com')) {
  startTransition(() => {
    const restoreExternalDocumentChildren = removeExternalDocumentChildren();
    // Extract nonce from existing script tags
    const existingNonce =
      document.querySelector<HTMLScriptElement>('script[nonce]')?.nonce;

    hydrateRoot(
      document,
      <StrictMode>
        <NonceProvider value={existingNonce}>
          <HydratedRouter />
        </NonceProvider>
      </StrictMode>,
    );

    restoreExternalDocumentChildren();
  });
}

function removeExternalDocumentChildren() {
  const externalChildren = Array.from(document.documentElement.children).filter(
    (element) => element.tagName !== 'HEAD' && element.tagName !== 'BODY',
  );

  externalChildren.forEach((element) => element.remove());

  return () => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        externalChildren.forEach((element) => {
          if (!element.isConnected) {
            document.documentElement.appendChild(element);
          }
        });
      });
    });
  };
}
