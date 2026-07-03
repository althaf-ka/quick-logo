import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@quicklogo/ui/components/sheet";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerTrigger,
} from "@quicklogo/ui/components/drawer";
import { useIsMobile } from "@quicklogo/ui/hooks/use-mobile";
import { cn } from "@quicklogo/ui/lib/utils";
import {
  SparkleIcon,
  CoffeeIcon,
  ScalesIcon,
  HardHatIcon,
  MonitorIcon,
  ForkKnifeIcon,
  TShirtIcon,
  BarbellIcon,
  HeartbeatIcon,
  BankIcon,
  GraduationCapIcon,
  GameControllerIcon,
  PaletteIcon,
  CaretRightIcon,
  XIcon,
  HouseIcon,
  FlowerIcon,
  StorefrontIcon,
  AirplaneIcon,
  MusicNoteIcon,
  PawPrintIcon,
  PlantIcon,
  BriefcaseIcon,
  WrenchIcon,
  CalendarIcon,
} from "@phosphor-icons/react";

const INDUSTRIES = [
  {
    id: "",
    label: "Auto-detect",
    icon: SparkleIcon,
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    id: "tech",
    label: "Technology",
    icon: MonitorIcon,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    id: "food",
    label: "Food & Dining",
    icon: ForkKnifeIcon,
    color: "text-orange-500",
    bg: "bg-orange-500/10",
  },
  {
    id: "healthcare",
    label: "Healthcare",
    icon: HeartbeatIcon,
    color: "text-teal-500",
    bg: "bg-teal-500/10",
  },
  {
    id: "fitness",
    label: "Fitness",
    icon: BarbellIcon,
    color: "text-red-500",
    bg: "bg-red-500/10",
  },
  {
    id: "finance",
    label: "Finance",
    icon: BankIcon,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  {
    id: "creative",
    label: "Creative",
    icon: PaletteIcon,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
  },
  {
    id: "fashion",
    label: "Fashion",
    icon: TShirtIcon,
    color: "text-pink-500",
    bg: "bg-pink-500/10",
  },
  {
    id: "coffee",
    label: "Cafe & Coffee",
    icon: CoffeeIcon,
    color: "text-amber-700",
    bg: "bg-amber-700/10",
  },
  {
    id: "construction",
    label: "Construction",
    icon: HardHatIcon,
    color: "text-yellow-600",
    bg: "bg-yellow-600/10",
  },
  {
    id: "legal",
    label: "Legal",
    icon: ScalesIcon,
    color: "text-slate-500",
    bg: "bg-slate-500/10",
  },
  {
    id: "education",
    label: "Education",
    icon: GraduationCapIcon,
    color: "text-indigo-500",
    bg: "bg-indigo-500/10",
  },
  {
    id: "gaming",
    label: "Gaming",
    icon: GameControllerIcon,
    color: "text-rose-500",
    bg: "bg-rose-500/10",
  },
  {
    id: "realestate",
    label: "Real Estate",
    icon: HouseIcon,
    color: "text-sky-500",
    bg: "bg-sky-500/10",
  },
  {
    id: "beauty",
    label: "Beauty & Spa",
    icon: FlowerIcon,
    color: "text-pink-400",
    bg: "bg-pink-400/10",
  },
  {
    id: "retail",
    label: "Retail & Shop",
    icon: StorefrontIcon,
    color: "text-orange-400",
    bg: "bg-orange-400/10",
  },
  {
    id: "travel",
    label: "Travel",
    icon: AirplaneIcon,
    color: "text-cyan-500",
    bg: "bg-cyan-500/10",
  },
  {
    id: "entertainment",
    label: "Entertainment",
    icon: MusicNoteIcon,
    color: "text-violet-500",
    bg: "bg-violet-500/10",
  },
  {
    id: "pets",
    label: "Pets & Vets",
    icon: PawPrintIcon,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  {
    id: "agriculture",
    label: "Agriculture",
    icon: PlantIcon,
    color: "text-green-600",
    bg: "bg-green-600/10",
  },
  {
    id: "consulting",
    label: "Consulting",
    icon: BriefcaseIcon,
    color: "text-slate-600",
    bg: "bg-slate-600/10",
  },
  {
    id: "homeservices",
    label: "Home Services",
    icon: WrenchIcon,
    color: "text-yellow-500",
    bg: "bg-yellow-500/10",
  },
  {
    id: "events",
    label: "Events & Weddings",
    icon: CalendarIcon,
    color: "text-rose-400",
    bg: "bg-rose-400/10",
  },
];

export interface IndustryPickerProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  variant?: "inline" | "sidebar";
}

export function IndustryPicker({
  value,
  onChange,
  disabled,
  variant = "inline",
}: IndustryPickerProps) {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();
  const selected = INDUSTRIES.find((i) => i.id === value) || INDUSTRIES[0];
  const Icon = selected.icon;

  const triggerContent =
    variant === "inline" ? (
      <>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground/50 shrink-0 text-left text-[10px] font-bold tracking-wider uppercase select-none">
              Industry:
            </span>
            <div className="bg-border h-4 w-px shrink-0" />
          </div>
          <div className="flex items-center gap-3">
            <Icon
              weight={selected.id === "" ? "fill" : "regular"}
              className={cn("size-[14px]", selected.color)}
            />
            <span className="text-foreground truncate text-xs font-normal">
              {selected.label}
            </span>
          </div>
        </div>
        <CaretRightIcon className="size-4 opacity-50" />
      </>
    ) : (
      <>
        <div className="flex flex-1 items-center gap-3">
          <div
            className={cn(
              "flex size-7 shrink-0 items-center justify-center transition-transform duration-150 group-hover:scale-105",
              selected.bg,
            )}
          >
            <Icon
              weight={selected.id === "" ? "fill" : "regular"}
              className={cn("size-4", selected.color)}
            />
          </div>
          <span className="text-foreground flex-1 truncate text-xs font-medium">
            {selected.label}
          </span>
        </div>
        {value !== "" ? (
          <div
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onChange("");
            }}
            className="text-muted-foreground/50 hover:text-destructive flex size-5 shrink-0 items-center justify-center rounded-none transition-colors"
          >
            <XIcon weight="bold" className="size-3" />
          </div>
        ) : null}
      </>
    );

  const triggerButtonProps = {
    disabled,
    className:
      variant === "inline"
        ? "ring-offset-background placeholder:text-muted-foreground flex h-10 w-full items-center justify-between rounded-none border-none bg-transparent px-3 text-sm shadow-sm outline-none focus:ring-0 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 sm:border-l"
        : "group hover:border-primary/40 hover:bg-muted/30 flex w-full cursor-pointer items-center gap-3 border px-3 py-2 text-left transition-colors rounded-none outline-none focus:ring-0 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
  };

  const renderContent = () => (
    <div className="[&::-webkit-scrollbar-thumb]:bg-border/60 hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/40 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border/60 flex h-full w-full flex-col overflow-y-auto px-4 pb-6 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent">
      <button
        onClick={() => {
          onChange("");
          setOpen(false);
        }}
        className={cn(
          "hover:bg-muted/50 mb-4 flex w-full cursor-pointer items-center justify-start gap-4 rounded-none border p-3 transition-colors outline-none focus:ring-0 focus:outline-none",
          value === ""
            ? "border-primary bg-primary/5 ring-primary ring-1"
            : "border-border/50",
        )}
      >
        <div className="bg-primary/10 flex size-8 items-center justify-center rounded-none">
          <SparkleIcon weight="fill" className="text-primary size-4" />
        </div>
        <div className="flex flex-col items-start">
          <span
            className={cn(
              "text-sm font-medium",
              value === "" ? "text-primary" : "text-foreground",
            )}
          >
            Auto-detect
          </span>
        </div>
      </button>

      <div className="flex flex-col gap-2">
        {INDUSTRIES.slice(1).map((industry) => {
          const IndIcon = industry.icon;
          const isSelected = value === industry.id;

          return (
            <button
              key={industry.id}
              onClick={() => {
                onChange(industry.id);
                setOpen(false);
              }}
              className={cn(
                "hover:bg-muted/50 flex w-full cursor-pointer items-center justify-start gap-4 rounded-none border p-3 transition-colors outline-none focus:ring-0 focus:outline-none",
                isSelected
                  ? "border-primary bg-primary/5 ring-primary ring-1"
                  : "border-border/50",
              )}
            >
              <div
                className={cn(
                  "flex size-8 items-center justify-center rounded-none",
                  industry.bg,
                )}
              >
                <IndIcon
                  weight="regular"
                  className={cn("size-4", industry.color)}
                />
              </div>
              <div className="flex flex-col items-start">
                <span
                  className={cn(
                    "text-sm font-medium",
                    isSelected ? "text-primary" : "text-foreground",
                  )}
                >
                  {industry.label}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen} nested>
        <DrawerTrigger asChild>
          <button {...triggerButtonProps}>{triggerContent}</button>
        </DrawerTrigger>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="border-border/40 mb-4 border-b pb-4">
            <DrawerTitle>Select Industry</DrawerTitle>
            <DrawerDescription>
              Help the AI generate better visual concepts for your brand.
            </DrawerDescription>
          </DrawerHeader>
          {renderContent()}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<button {...triggerButtonProps} />}>
        {triggerContent}
      </SheetTrigger>
      <SheetContent>
        <SheetHeader className="border-border/40 mb-4 border-b pb-4">
          <SheetTitle>Select Industry</SheetTitle>
          <SheetDescription>
            Help the AI generate better visual concepts for your brand.
          </SheetDescription>
        </SheetHeader>
        {renderContent()}
      </SheetContent>
    </Sheet>
  );
}
