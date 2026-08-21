// TEMPORARY dev-only harness for the SkyConfigurator until the Shopify
// product exists. Not committed; delete after visual verification.
import {useState} from 'react';
import {SkyConfigurator} from '~/components/SkyConfigurator';
import {toCartAttributes, type SkyParams} from '~/lib/sky/params';
import type {SkySizeKey} from '~/lib/sky/products';

export default function DevSky() {
  const [params, setParams] = useState<SkyParams | null>(null);
  const [size, setSize] = useState<SkySizeKey>('8x10');
  return (
    <div className="product-page">
      <section className="product-detail-layout">
        <SkyConfigurator size={size} theme="linen" onChange={setParams} />
        <div className="product-purchase-panel">
          <h1>Dev: Your Sky</h1>
          <p>
            <button type="button" onClick={() => setSize('8x10')}>8x10</button>{' '}
            <button type="button" onClick={() => setSize('20x24')}>20x24</button>
          </p>
          <pre data-testid="sky-params" style={{whiteSpace: 'pre-wrap', fontSize: 12}}>
            {params ? JSON.stringify(toCartAttributes(params), null, 2) : 'null'}
          </pre>
        </div>
      </section>
    </div>
  );
}
