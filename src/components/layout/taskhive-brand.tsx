import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import taskHiveMark from "@/logos/Golden Folded Cube Emblem.png";

/** Shared TaskHive mark and wordmark for every app and account header. */
export function TaskHiveBrand({
  className,
  iconClassName,
  showName = true,
}: {
  className?: string;
  iconClassName?: string;
  showName?: boolean;
}) {
  return (
    <Link
      aria-label="TaskHive home"
      className={cn("inline-flex items-center gap-2 font-extrabold tracking-tight", className)}
      href="/"
    >
      <Image
        alt=""
        className={cn("aspect-square h-8 w-8 object-contain", iconClassName)}
        height={32}
        priority
        src={taskHiveMark}
        width={32}
      />
      {showName && <span><span className="text-[#FFC800]">Task</span>Hive</span>}
    </Link>
  );
}
