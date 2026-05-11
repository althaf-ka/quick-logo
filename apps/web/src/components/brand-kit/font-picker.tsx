import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@quicklogo/ui/components/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@quicklogo/ui/components/popover";
import { Button } from "@quicklogo/ui/components/button";
import { Skeleton } from "@quicklogo/ui/components/skeleton";
import { CaretUpDownIcon } from "@phosphor-icons/react";
import { useGoogleFonts } from "@/hooks/use-google-fonts";
import {
  preloadGoogleFonts,
  useGoogleFontLoader,
} from "@/hooks/use-google-font-loader";

interface FontPickerProps {
  value: string;
  onValueChange: (family: string) => void;
  label?: string;
  placeholder?: string;
}

const VISIBLE_BATCH_SIZE = 40;

export function FontPicker({
  value,
  onValueChange,
  label,
  placeholder = "Search fonts...",
}: FontPickerProps) {
  const apiKey = import.meta.env.VITE_GOOGLE_FONTS_API_KEY ?? "";
  const hasApiKey = apiKey.trim().length > 0;

  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(VISIBLE_BATCH_SIZE);
  const listRef = useRef<HTMLDivElement>(null);

  const { data: fonts, isLoading } = useGoogleFonts(apiKey);

  useGoogleFontLoader(value);

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setVisibleCount(VISIBLE_BATCH_SIZE);
      setSearchQuery("");
    }
  }, []);

  // Reset pagination when search query changes
  useEffect(() => {
    setVisibleCount(VISIBLE_BATCH_SIZE);
  }, [searchQuery]);

  const handleScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      const target = event.currentTarget;
      const nearBottom =
        target.scrollHeight - target.scrollTop - target.clientHeight < 100;

      const filteredCount = (fonts ?? []).filter((f) =>
        f.family.toLowerCase().includes(searchQuery.toLowerCase()),
      ).length;

      if (nearBottom && fonts && visibleCount < filteredCount) {
        setVisibleCount((prev) =>
          Math.min(prev + VISIBLE_BATCH_SIZE, filteredCount),
        );
      }
    },
    [fonts, visibleCount, searchQuery],
  );

  const visibleFonts = useMemo(() => {
    const fontList = fonts ?? [];
    if (!searchQuery) return fontList.slice(0, visibleCount);

    const normalizedQuery = searchQuery.toLowerCase();
    return fontList
      .filter((font) => font.family.toLowerCase().includes(normalizedQuery))
      .slice(0, visibleCount);
  }, [fonts, searchQuery, visibleCount]);

  // Dynamically load font-faces for visible items in the dropdown
  useEffect(() => {
    if (visibleFonts.length === 0) return;
    preloadGoogleFonts(visibleFonts.map((f) => f.family));
  }, [visibleFonts]);

  // Resolve cmdk's lowercased values back to original casing
  const familyLookup = useMemo(() => {
    const map = new Map<string, string>();
    for (const font of fonts ?? []) {
      map.set(font.family.toLowerCase(), font.family);
    }
    return map;
  }, [fonts]);

  if (!hasApiKey) {
    return (
      <div className="rounded border border-dashed px-3 py-2">
        <p className="text-muted-foreground/50 font-mono text-[10px]">
          Set VITE_GOOGLE_FONTS_API_KEY to browse fonts
        </p>
      </div>
    );
  }

  if (isLoading) {
    return <Skeleton className="h-8 w-full" />;
  }

  return (
    <div className="space-y-1">
      {label && (
        <label className="text-muted-foreground/50 font-mono text-[9px] tracking-wider uppercase">
          {label}
        </label>
      )}
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              size="sm"
              className="bg-muted/30 hover:bg-muted/50 h-9 w-full cursor-pointer justify-between border-transparent px-3 text-xs font-normal transition-colors"
            />
          }
        >
          <span
            className="truncate text-[13px]"
            style={{ fontFamily: value || "inherit" }}
          >
            {value || "Select a font..."}
          </span>
          <CaretUpDownIcon className="text-muted-foreground/40 size-3.5 shrink-0" />
        </PopoverTrigger>
        <PopoverContent
          className="border-border/20 w-[var(--anchor-width)] overflow-hidden p-0 shadow-xl"
          align="start"
        >
          <Command className="bg-transparent" shouldFilter={false}>
            <CommandInput
              placeholder={placeholder}
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList
              ref={listRef}
              className="scrollbar-subtle max-h-56"
              onScroll={handleScroll}
            >
              <CommandEmpty className="text-muted-foreground/40 py-4 text-center text-[10px]">
                No matching fonts.
              </CommandEmpty>
              <CommandGroup className="p-0">
                {visibleFonts.map((font) => {
                  const isSelected = font.family === value;
                  return (
                    <CommandItem
                      key={font.family}
                      value={font.family}
                      data-checked={isSelected}
                      className="data-[selected=true]:bg-primary/5 data-[selected=true]:text-foreground data-[checked=true]:bg-primary/12 data-[checked=true]:text-primary cursor-pointer rounded-none px-3 py-2.5 transition-colors duration-150 ease-out data-[checked=true]:font-medium"
                      onSelect={(lowercasedValue) => {
                        const family =
                          familyLookup.get(lowercasedValue) ?? lowercasedValue;
                        preloadGoogleFonts([family]);
                        onValueChange(family);
                        setOpen(false);
                      }}
                    >
                      <span
                        className="truncate text-xs"
                        style={{ fontFamily: font.family }}
                      >
                        {font.family}
                      </span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
