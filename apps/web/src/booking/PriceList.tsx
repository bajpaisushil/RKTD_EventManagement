import { formatCents, timeZoneName, type FestivalView, type ProductView } from "@rktd/domain";

function StockBadge({ product }: { product: ProductView }) {
  if (product.status === "SOLD_OUT") {
    return <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap text-white">Sold out</span>;
  }
  if (product.status === "LOW") {
    return <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap text-heading">Only {product.left} left</span>;
  }
  return null;
}

function ProductCard({ product }: { product: ProductView }) {
  const soldOut = product.status === "SOLD_OUT";
  return (
    <li className="glass flex flex-col gap-1 rounded-xl p-3 sm:gap-2 sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className={`text-sm font-semibold sm:text-base ${soldOut ? "line-through decoration-white/50" : ""}`}>{product.label}</h3>
        <StockBadge product={product} />
      </div>
      <p className={`text-xl font-semibold sm:text-2xl ${soldOut ? "text-white/80" : "text-primary"}`}>
        {formatCents(product.priceCents)} <span className="text-sm font-normal text-white/70">{product.priceUnit}</span>
      </p>
      <p className="hidden text-sm text-white/75 sm:block">{product.description}</p>
    </li>
  );
}

export function PriceList({ festival }: { festival: FestivalView }) {
  const tickets = festival.products.filter((p) => p.category === "ENTRY");
  const extras = festival.products.filter((p) => p.category === "EXTRA");
  return (
    <section aria-labelledby="prices-heading" className="mx-auto max-w-6xl space-y-6 px-4 pt-14 sm:px-6">
      <div className="space-y-2">
        <h2 id="prices-heading" className="font-serif text-4xl font-semibold text-primary sm:text-5xl">
          Tickets and prices
        </h2>
        <p className="max-w-3xl text-white/80">
          Under-{festival.agePolicy.childFromAge}s come free. Children {festival.agePolicy.childFromAge}–{festival.agePolicy.adultFromAge - 1} pay child prices. Ages count on the first
          day of the festival. Everyone in a booking holds one kind of ticket. Each day can be booked online until 11:59pm {timeZoneName(festival.timeZone)} that day.
        </p>
      </div>
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {tickets.map((product) => (
          <ProductCard key={product.code} product={product} />
        ))}
      </ul>
      <h3 className="font-serif text-2xl font-semibold text-white">Extras</h3>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {extras.map((product) => (
          <ProductCard key={product.code} product={product} />
        ))}
      </ul>
    </section>
  );
}
