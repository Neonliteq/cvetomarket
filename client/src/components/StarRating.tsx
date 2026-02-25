import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  rating: number;
  max?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
  showValue?: boolean;
  count?: number;
}

export function StarRating({ rating, max = 5, size = "sm", className, showValue, count }: StarRatingProps) {
  const sizeClass = size === "sm" ? "w-3 h-3" : size === "md" ? "w-4 h-4" : "w-5 h-5";
  const textClass = size === "sm" ? "text-xs" : size === "md" ? "text-sm" : "text-base";
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <div className="flex items-center gap-0.5">
        {Array.from({ length: max }).map((_, i) => (
          <Star
            key={i}
            className={cn(sizeClass, i < Math.round(rating) ? "fill-amber-400 text-amber-400" : "fill-muted text-muted-foreground")}
          />
        ))}
      </div>
      {showValue && (
        <span className={cn(textClass, "text-muted-foreground font-medium")}>
          {count === 0 ? "Нет оценок" : <>{Number(rating).toFixed(1)}{count !== undefined && <span className="ml-0.5">({count})</span>}</>}
        </span>
      )}
    </div>
  );
}

interface InteractiveStarRatingProps {
  value: number;
  onChange: (v: number) => void;
  size?: "sm" | "md" | "lg";
}

export function InteractiveStarRating({ value, onChange, size = "lg" }: InteractiveStarRatingProps) {
  const sizeClass = size === "sm" ? "w-4 h-4" : size === "md" ? "w-6 h-6" : "w-8 h-8";
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <button key={i} type="button" onClick={() => onChange(i + 1)} className="focus:outline-none">
          <Star className={cn(sizeClass, i < value ? "fill-amber-400 text-amber-400" : "fill-muted text-muted")} />
        </button>
      ))}
    </div>
  );
}
