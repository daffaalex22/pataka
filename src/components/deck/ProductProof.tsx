import Image from 'next/image'

export type ProductProofItem = {
  src: string
  alt: string
  label: string
  caption: string
}

export function ProductProof({ items }: { items: ProductProofItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((item) => (
        <figure key={item.src} className="min-w-0">
          <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-line bg-black/40">
            <Image
              src={item.src}
              alt={item.alt}
              fill
              unoptimized
              loading="eager"
              sizes="(min-width: 1024px) 22vw, 42vw"
              className="object-contain"
            />
          </div>
          <figcaption className="mt-2">
            <p className="text-sm font-semibold">{item.label}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">{item.caption}</p>
          </figcaption>
        </figure>
      ))}
    </div>
  )
}
