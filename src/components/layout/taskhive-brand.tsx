import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import taskHiveMark from "@/logos/Golden Folded Cube Emblem.png";

/** Shared TaskHive mark and wordmark for every app and account header. */
export function TaskHiveBrand({
  className,
  iconClassName,
}: {
  className?: string;
  iconClassName?: string;
}) {
  return (
    <Link
      aria-label="TaskHive home"
      className={cn("inline-flex items-center gap-2 font-extrabold tracking-tight", className)}
      href="/"
    >
      <Image
        alt=""
        className={cn("object-contain", iconClassName)}
        height={1200}
        priority
        src={taskHiveMark}
        width={1310}
      />
      <span><span className="text-[#FFC800]">Task</span>Hive</span>
    </Link>
  );
}
