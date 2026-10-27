import { Star } from "lucide-react";

export function Stars({ rating }: { rating: number }) {
  return (
    <span
      aria-label={`${rating} out of 5`}
      className="flex items-center gap-0.5"
    >
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          aria-hidden="true"
          className={
            index < rating
              ? "h-4 w-4 fill-[#FFC800] text-[#FFC800]"
              : "h-4 w-4 text-zinc-200 dark:text-zinc-700"
          }
          key={index}
        />
      ))}
    </span>
  );
}
