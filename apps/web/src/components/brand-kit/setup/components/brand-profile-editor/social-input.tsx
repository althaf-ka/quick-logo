import { Label } from "@quicklogo/ui/components/label";
import { Input } from "@quicklogo/ui/components/input";

const inputClassName =
  "h-10 rounded-none border-white/[0.08] bg-zinc-950/70 px-3 text-xs text-foreground placeholder:text-muted-foreground/50 focus-visible:border-primary/50 focus-visible:ring-primary/20";

interface SocialInputProps {
  id: string;
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  onBlur: (value: string) => void;
}

export function SocialInput({
  id,
  label,
  icon,
  value,
  onChange,
  onBlur,
}: SocialInputProps) {
  return (
    <div>
      <Label
        htmlFor={id}
        className="text-foreground/70 mb-1.5 flex items-center gap-2 text-[10px] font-semibold tracking-wider uppercase"
      >
        {icon}
        {label}
      </Label>
      <Input
        id={id}
        name={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => onBlur(e.target.value)}
        className={inputClassName}
        placeholder="username or profile URL"
      />
    </div>
  );
}
