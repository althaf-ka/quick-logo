import * as React from "react";
import Autoplay from "embla-carousel-autoplay";
import Fade from "embla-carousel-fade";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@quicklogo/ui/components/carousel";

const images = [
  "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1636690513351-0af1763f6237?q=80&w=800&auto=format&fit=crop",
];

export function FeatureCarousel() {
  const plugin = React.useRef(
    Autoplay({ delay: 4000, stopOnInteraction: false }),
  );

  const fadePlugin = React.useRef(Fade());

  return (
    <div className="pointer-events-none mb-8 w-full select-none">
      <Carousel
        plugins={[plugin.current, fadePlugin.current]}
        className="w-full"
        opts={{
          loop: true,
          duration: 60,
          watchDrag: false,
        }}
      >
        <CarouselContent>
          {images.map((img, index) => (
            <CarouselItem key={index}>
              <div className="aspect-square w-full overflow-hidden rounded-xs bg-gray-50">
                <img src={img} alt="" className="h-full w-full object-cover" />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </div>
  );
}
