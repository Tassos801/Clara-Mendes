/**
 * One row of a product page's details: a native disclosure, so the long
 * delivery, returns and care copy stays one tap away instead of pushing the
 * rest of the page down on a phone. Native `<details>` keeps keyboard and
 * screen-reader behaviour, and find-in-page still opens a closed row.
 */
export function ProductDetail({
  children,
  defaultOpen = false,
  label,
}: {
  children: React.ReactNode;
  defaultOpen?: boolean;
  label: string;
}) {
  return (
    <details className="product-detail" open={defaultOpen || undefined}>
      <summary>
        <span>{label}</span>
        <svg aria-hidden="true" viewBox="0 0 12 12">
          <path d="M2.5 4.5 6 8l3.5-3.5" />
        </svg>
      </summary>
      <div className="product-detail-body">{children}</div>
    </details>
  );
}
