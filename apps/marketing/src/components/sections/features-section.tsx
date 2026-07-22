import {
  ImagesIcon,
  MagicWandIcon,
  PaletteIcon,
  ShapesIcon,
} from "@phosphor-icons/react/dist/ssr";

const features = [
  {
    icon: MagicWandIcon,
    title: "Explore Clear Directions",
    description:
      "Explore focused concepts shaped around your business, audience, and creative direction.",
  },
  {
    icon: PaletteIcon,
    title: "Build a Visual System",
    description:
      "Get a considered color palette and typography pairing—not disconnected design choices.",
  },
  {
    icon: ShapesIcon,
    title: "Use It Consistently",
    description:
      "Know how to use your identity consistently across real products, content, and campaigns.",
  },
  {
    icon: ImagesIcon,
    title: "Export Launch Assets",
    description:
      "Generate social banners, presentation visuals, business cards, and export-ready files.",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="scroll-mt-16 border-b">
      <div className="mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-28">
        <div className="mb-12 grid gap-5 md:grid-cols-2 md:items-end">
          <div className="flex flex-col gap-3">
            <p className="text-primary text-xs font-medium tracking-[0.18em] uppercase">
              Built for the Whole Identity
            </p>
            <h2 className="text-3xl font-semibold tracking-[-0.045em] text-balance sm:text-5xl">
              Fewer Tools. One Consistent Result.
            </h2>
          </div>
          <p className="text-muted-foreground max-w-xl text-sm leading-6 md:justify-self-end">
            QuickLogo keeps every part of your identity connected, so the final
            result feels intentional from the first impression to every asset
            after it.
          </p>
        </div>

        <div className="bg-border grid gap-px border sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ icon: Icon, title, description }, index) => (
            <article
              key={title}
              className="bg-background flex min-h-64 flex-col p-5"
            >
              <div className="flex items-center justify-between">
                <Icon
                  className="text-primary size-5"
                  weight="regular"
                  aria-hidden="true"
                />
                <span className="text-muted-foreground text-[10px]">
                  0{index + 1}
                </span>
              </div>
              <div className="mt-auto flex flex-col gap-3 pt-14">
                <h3 className="text-sm font-medium">{title}</h3>
                <p className="text-muted-foreground text-xs leading-5">
                  {description}
                </p>
                <span className="text-muted-foreground mt-2 text-[10px] tracking-[0.14em] uppercase">
                  Included
                </span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
