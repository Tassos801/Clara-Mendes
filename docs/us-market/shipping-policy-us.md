# US section for the shipping policy (draft, not live)

Step A6/B5 in [status.md](status.md). This text is **not** in
[`docs/shopify-policies-drafts.md`](../shopify-policies-drafts.md) yet,
because that file must match the live Admin policy exactly. At B5, with the
owner's go-ahead, and only after B2 (USD market) and B3 (US zones) are live:

1. Fill in the `{{…}}` placeholders from B3's saved rates. Leave out any line
   whose product doesn't ship to the US at that point (check D5).
2. Insert the section below into the Shipping Policy block of
   `docs/shopify-policies-drafts.md`, just before
   `<h2>Lost or delayed shipments</h2>`. Add a US mention to the matching
   "Shipping costs" bullets. Leave every EU, Cyprus and other-country
   sentence unchanged.
3. Paste the whole Shipping Policy block into Admin (see the owner's
   policy-editor notes) and diff the live `/policies/shipping-policy`
   against the draft.

```html
<h2>Orders to the United States</h2>
<p>Prices for US orders are shown in US dollars and exclude any sales tax, which checkout adds where it applies.</p>
<p>Art prints, stretched canvas, phone cases and unframed Your Sky maps are printed to order and dispatched within 2–4 business days. After dispatch, delivery within the United States is estimated at 7–15 business days. Quiet Current activewear and DIY book nook kits follow the timings in their own sections above.</p>
<p>US shipping: art prints and unframed Your Sky maps {{US_PRINT_RATE}}; stretched canvas {{US_CANVAS_RATE}}; phone cases {{US_CASE_RATE}}; Quiet Current activewear {{US_APPAREL_RATE}} per order. Checkout confirms the fee for your address.</p>
<p>Framed pieces, greeting cards, postcards and Pastel Forms plant pots do not currently ship to the United States.</p>
```

The sentences check out against the code on `claude/us-market`:
`DISPATCH_WINDOW_BUSINESS_DAYS` (2–4), `DELIVERY_US_BUSINESS_DAYS` (7–15),
the 2026-10-18 Storefront readback (framed, cards, postcards and pots are
not buyable from the US), and A2's rule that Quiet Current keeps its own
window. The import-duty wording stays in the existing "Import taxes and
duties" section. Change it for the US only after A2b confirms which lines
are made in the US.
