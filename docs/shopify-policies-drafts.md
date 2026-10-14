# Shopify Policy Drafts — Clara Mendes

Paste each section into the corresponding field in Shopify Admin:
**Settings > Policies** (https://admin.shopify.com/store/vre00g-8b/settings/legal)

Each policy is written in HTML so Shopify's rich text editor preserves formatting.

On 2026-10-14 each block was compared with the body the live
`/policies/<handle>` page serves: the refund and terms blocks match it
exactly. The shipping block is the live text plus the Quiet Current
activewear bullet and section, which are not yet pasted into Admin. The
privacy policy is Shopify's generated template and is not drafted here.

---

## Shipping Policy

Paste into: **Shipping policy** (live version 2026-10-06: worldwide except
the UK; rates mirror the Shopify shipping profiles, see
`docs/llm-wiki/modules/fulfillment.md`. The activewear rates and windows
mirror `APPAREL_SHIPPING_RATES` and the `APPAREL_*_WINDOW_BUSINESS_DAYS`
constants in `app/lib/storefrontBasics.ts`; change them together.)

```html
<h2>Printed products: processing time</h2>
<p>Our printed products are made to order and dispatched within 2–4 business days. You will receive a confirmation email once your order has been placed and a second email with dispatch details once it ships.</p>

<h2>Printed products: delivery times</h2>
<p>After dispatch, delivery is estimated at 5–10 business days across the European Union and 7–20 business days to other countries. Delivery estimates are calculated from the ship date, not the order date.</p>
<p>Please note that shipping times may vary during holidays or periods of high demand.</p>

<h2>Shipping methods</h2>
<p>Unless a product-specific untracked method is stated below, we ship via standard tracked delivery. Tracking details are sent by email once your order leaves our fulfillment center. You can check your order status using the tracking link when provided.</p>

<h2>Shipping destinations</h2>
<p>We ship to every European Union country and to most countries worldwide. We do not currently ship to the United Kingdom. Greeting cards and postcards ship within the European Union only, and stretched canvas and framed pieces ship outside the European Union to selected countries. Checkout shows whether each item can be delivered to your address.</p>

<h2>Shipping costs</h2>
<p>Shipping is calculated at checkout from your delivery address and the items in your order:</p>
<ul>
<li>Art prints and unframed Your Sky maps: Cyprus EUR 3.99; other EU countries EUR 16.00; Switzerland, Norway, Iceland and several other non-EU European countries EUR 9.99; most other countries EUR 17.99; a few remote destinations EUR 39.99.</li>
<li>Stretched canvas and framed Your Sky maps: Cyprus EUR 3.99; other EU countries EUR 16.00; selected countries outside the EU EUR 29.99.</li>
<li>Phone cases: Cyprus EUR 3.99; other EU countries EUR 4.95; Switzerland, Norway and a few other non-EU European countries EUR 6.99; other countries EUR 12.99.</li>
<li>Greeting cards and postcards: EUR 2.90 by letter post, EU only.</li>
<li>Pastel Forms plant pots: EUR 6.99 across the EU; EUR 11.99 to most other countries (not the United States).</li>
<li>DIY book nook kits: delivery included.</li>
<li>Quiet Current activewear: Cyprus EUR 3.99; other EU countries, the United States and Japan EUR 4.95; Canada, Australia, New Zealand and several other non-EU European countries EUR 6.99; Switzerland, Norway, Iceland and Liechtenstein EUR 9.99; other countries EUR 12.99. One fee per order, however many activewear pieces it holds.</li>
</ul>
<p>Mixed orders may combine shipping charges for different products at checkout. Any applicable taxes are shown before payment.</p>

<h2>Import taxes and duties</h2>
<p>Orders delivered outside the European Union may be subject to import taxes, duties and carrier handling fees. These are payable by the recipient on delivery and are not included in the product price or shipping rate. Delivery estimates exclude customs delays.</p>

<h2>Pastel Forms ceramic plant pots</h2>
<p>Plant pots are printed in the United Kingdom and sent by Royal Mail Airmail Untracked, without a tracking number. Because they ship from the United Kingdom, import taxes, duties and carrier handling fees may also be payable on delivery within the European Union.</p>

<h2>DIY book nook kits</h2>
<p>Book nook kits are supplied in the manufacturer's packaging and ship separately from our printed products, directly from our fulfilment partner in China. Delivery is included in the kit price to every country we ship to; other products in a mixed order may have separate shipping charges at checkout.</p>
<p>Allow an estimated 1–3 days for processing. Germany: estimated 8–18 days after dispatch. Cyprus: most quoted deliveries take 8–21 days after dispatch; some take 24 days or longer. Other countries: delivery times are not yet confirmed; most parcels arrive within 10–25 days after dispatch, and remote areas can take longer. These are estimates, and customs, holidays or carrier delays can extend them. Tracking details are sent when available.</p>
<p>For EU orders we arrange import VAT through our fulfilment partner. If a customs or carrier charge is requested on an EU delivery, contact hello@shopclaramendes.com before paying so we can check the shipment. Outside the EU, import taxes and duties may be payable on delivery.</p>

<h2>Quiet Current activewear</h2>
<p>Quiet Current activewear is printed, cut and sewn to order by our fulfilment partner, so it takes longer than our other printed products. Production takes 2–7 business days and orders are dispatched within 3–8 business days. After dispatch, delivery is estimated at 5–10 business days across the European Union and 7–20 business days to other countries.</p>
<p>Activewear shipping is charged once per order, however many activewear pieces it holds: Cyprus EUR 3.99; other EU countries, the United States and Japan EUR 4.95; Albania, Andorra, Bosnia and Herzegovina, Moldova, Monaco, Montenegro, North Macedonia, San Marino, Serbia, Ukraine, Vatican City, Canada, Australia and New Zealand EUR 6.99; Switzerland, Norway, Iceland and Liechtenstein EUR 9.99; every other country we ship to EUR 12.99. Other items in the same order ship at their own rates, and checkout confirms the fee for your address.</p>
<p>Orders shipped to the United States are made with a heavier fabric. Each product page lists the fabric used for US orders and for all other destinations.</p>

<h2>Lost or delayed shipments</h2>
<p>If your order has not arrived within 15 business days of the ship date (25 business days outside the European Union), please contact us at <a href="mailto:hello@shopclaramendes.com">hello@shopclaramendes.com</a> with your order number and we will investigate promptly.</p>
```

---

## Refund Policy

Paste into: **Refund policy**

```html
<p>Thank you for shopping with Clara Mendes. We want you to love every piece you bring home. If something isn't right, we're here to help.</p>
<p><strong>Returns</strong></p>
<p>We accept returns within 30 days of delivery. To be eligible for a return, items must be unused, in their original packaging, and in the same condition you received them.</p>
<p>To start a return, submit a request through your customer account where available, or email <a href="mailto:hello@shopclaramendes.com">hello@shopclaramendes.com</a> with your order number and reason for the return. We will provide return instructions once your request is approved.</p>
<p><strong>Return shipping</strong></p>
<p>For an ordinary return, you are responsible for arranging and paying the return postage. If an item is defective, damaged, or incorrect, Clara Mendes will cover reasonable return shipping costs and arrange a replacement or refund at no additional cost to you.</p>
<p><strong>Cancellations and EU withdrawal</strong></p>
<p>Customers in Cyprus and the European Union may submit a cancellation or withdrawal request electronically through their customer account where available, or by emailing <a href="mailto:hello@shopclaramendes.com">hello@shopclaramendes.com</a>. Orders may be cancelled until fulfillment. After fulfillment or delivery, the 30-day return process applies. This policy does not limit any statutory cancellation, withdrawal, or consumer rights that apply to you.</p>
<p><strong>Non-returnable items</strong></p>
<p>The following items cannot be returned except where applicable law requires otherwise:</p>
<ul>
<li>Custom or personalized orders</li>
<li>Items marked as final sale</li>
<li>Items that have been used, assembled, or altered</li>
</ul>
<p><strong>Damaged, defective, or incorrect items</strong></p>
<p>If your order arrives damaged, defective, or incorrect, please contact us within 7 days of delivery with your order number and, where relevant, photos. We will arrange a replacement or full refund at no additional cost to you. Reporting within 7 days helps us resolve the issue quickly and does not limit statutory rights.</p>
<p><strong>Customs and duties</strong></p>
<p>For international orders, import duties, taxes, and customs charges are the customer's responsibility unless they were collected at checkout or applicable law requires otherwise. Charges paid directly to customs authorities may not be refundable by Clara Mendes. Contact your local customs authority about any refund they may provide.</p>
<p><strong>Refunds</strong></p>
<p>Once we receive and inspect your return, we will notify you by email. If approved, we will process the refund to your original payment method within 5–10 business days. Your bank or card provider may take additional time to post it. Original shipping charges are non-refundable for ordinary returns, but this does not apply when the return is due to a defective, damaged, or incorrect item or where applicable law requires otherwise. Where statutory withdrawal rules apply, we will also comply with the legally required refund timing and may withhold reimbursement until we receive the goods or evidence that they were returned.</p>
<p><strong>Exchanges</strong></p>
<p>We do not offer direct exchanges. If you would like a different item, please return the original and place a new order.</p>
<p><strong>Late or missing refunds</strong></p>
<p>If you haven't received your refund within 10 business days of our confirmation, please check with your bank or card provider first. If you still have not received it, contact us at <a href="mailto:hello@shopclaramendes.com">hello@shopclaramendes.com</a>.</p>
<p><strong>Questions</strong></p>
<p>For questions about returns, cancellations, withdrawal, or refunds, contact <a href="mailto:hello@shopclaramendes.com">hello@shopclaramendes.com</a>.</p>
```

---

## Terms of Service

Paste into: **Terms of service**

```html
<h2>Overview</h2>
  <p>This website is operated by Clara Mendes. Throughout the site, the terms "we," "us," and "our" refer to Clara Mendes. By visiting our site and purchasing from us, you agree to the following terms and conditions.</p>

  <h2>Online store terms</h2>
  <p>By using this site, you confirm that you are at least the age of majority in your state or province of residence. You may not use our products for any illegal or unauthorized purpose, and your use of the site must comply with all applicable laws.</p>

  <h2>Products and pricing</h2>
  <p>We reserve the right to modify or discontinue any product at any time without notice. Prices are subject to change without notice. We make every effort to display product colors and details accurately, but we cannot guarantee that your device display will reflect exact colors.</p>

  <h2>Orders and payment</h2>
  <p>All orders are subject to availability. We reserve the right to refuse or cancel any order for any reason, including suspected fraud. Payment is processed securely through Shopify at the time of checkout. Taxes and shipping costs are calculated and displayed before you confirm your purchase.</p>

  <h2>Accuracy of information</h2>
  <p>We strive to keep all content on this site current and accurate. Occasionally, information may contain errors or omissions. We reserve the right to correct errors and update information at any time without prior notice.</p>

  <h2>Third-party links</h2>
  <p>Our site may contain links to third-party websites that are not operated by us. We are not responsible for the content, privacy policies, or practices of any third-party sites.</p>

  <h2>Limitation of liability</h2>
  <p>Clara Mendes shall not be liable for indirect, incidental, special, or consequential damages arising from your use of our site or products. Our total liability for any claim related to a purchase shall not exceed the amount you paid for the item in question.</p>

  <h2>Changes to these terms</h2>
  <p>We may update these terms from time to time. Changes take effect immediately upon posting to this page. Your continued use of the site after any changes constitutes acceptance of the updated terms.</p>

  <h2>Contact</h2>
  <p>Questions about these terms can be sent to <a href="mailto:hello@shopclaramendes.com">hello@shopclaramendes.com</a>.</p>
```
