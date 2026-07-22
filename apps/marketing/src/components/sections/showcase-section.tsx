const deliverables = [
  "Logo Variations",
  "Color & Typography",
  "Social Assets",
  "Business Cards",
  "Brand Guidelines",
];

export function ShowcaseSection() {
  return (
    <section id="product" className="scroll-mt-20 border-b">
      <div className="mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-28">
        <div className="mb-12 grid gap-5 lg:grid-cols-[1fr_0.75fr] lg:items-end">
          <div className="flex max-w-2xl flex-col gap-3">
            <p className="text-primary text-xs font-medium tracking-[0.18em] uppercase">
              Beyond the First Mark
            </p>
            <h2 className="text-3xl font-semibold tracking-[-0.045em] text-balance sm:text-5xl">
              Everything You Need to Launch Consistently.
            </h2>
          </div>
          <p className="text-muted-foreground max-w-md text-sm leading-6 lg:justify-self-end">
            Choose the direction that fits, then carry the same visual language
            across every asset your brand needs.
          </p>
        </div>

        <div className="bg-border grid gap-px overflow-hidden border md:grid-cols-12 md:grid-rows-2">
          <article className="bg-primary text-primary-foreground flex min-h-[28rem] flex-col justify-between p-6 sm:p-8 md:col-span-7 md:row-span-2">
            <div className="flex items-center justify-between text-[10px] tracking-[0.16em] uppercase opacity-70">
              <span>Core Identity</span>
              <span>01</span>
            </div>
            <div className="flex flex-col gap-5">
              <div className="relative size-32 sm:size-40" aria-hidden="true">
                <span className="absolute inset-0 border border-current/50" />
                <span className="absolute inset-8 rotate-45 border border-current" />
                <span className="absolute top-1/2 left-1/2 size-3 -translate-x-1/2 -translate-y-1/2 bg-current" />
              </div>
              <div>
                <p className="text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">
                  Primary Mark
                </p>
                <p className="mt-2 text-xs tracking-[0.2em] uppercase opacity-70">
                  3 Logo Variations
                </p>
              </div>
            </div>
          </article>

          <article className="bg-card flex min-h-56 flex-col justify-between p-6 sm:p-8 md:col-span-5">
            <div className="text-muted-foreground flex items-center justify-between text-[10px] tracking-[0.16em] uppercase">
              <span>Brand Applications</span>
              <span>02</span>
            </div>
            <div className="mt-12 grid grid-cols-[1fr_0.7fr_0.45fr] items-end gap-3">
              <div className="bg-muted aspect-[4/3] border p-3">
                <div className="border-primary size-8 border" />
              </div>
              <div className="bg-background aspect-square border p-3">
                <div className="bg-primary size-5" />
              </div>
              <div className="bg-muted aspect-[3/4] border" />
            </div>
          </article>

          <article className="bg-background flex min-h-56 flex-col justify-between p-6 sm:p-8 md:col-span-5">
            <div className="text-muted-foreground flex items-center justify-between text-[10px] tracking-[0.16em] uppercase">
              <span>Complete Deliverables</span>
              <span>03</span>
            </div>
            <ul className="mt-8 grid gap-2 text-xs sm:grid-cols-2">
              {deliverables.map((deliverable, index) => (
                <li
                  key={deliverable}
                  className="flex items-center gap-2 py-1.5"
                >
                  <span className="text-primary tabular-nums">
                    0{index + 1}
                  </span>
                  <span>{deliverable}</span>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </div>
    </section>
  );
}
