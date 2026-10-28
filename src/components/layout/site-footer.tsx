import Link from "next/link";
import Image from "next/image";
import { CheckCircle2, Clock3 } from "lucide-react";
import taskHiveLogo from "@/logos/TaskhiveLogo.png";

/** Public footer shared by Home and guest-facing marketplace pages. */
export function SiteFooter() {
  return (
    <footer className="bg-black text-white">
      <div className="mx-auto flex min-h-[190px] w-full max-w-[1600px] flex-col items-center justify-center gap-8 px-4 py-10 text-center md:px-8 lg:px-12">
        <nav aria-label="Footer" className="flex flex-wrap justify-center gap-x-6 gap-y-3 text-xs text-zinc-400">
          <Link href="/">About Us</Link>
          <Link href="/tasks">Browse Tasks</Link>
          <Link href="/signup">Terms</Link>
          <Link href="/signup">Privacy Policy</Link>
        </nav>
        <p className="flex flex-col items-center gap-2 text-xs text-zinc-400">
          <Image alt="TaskHive" className="h-14 w-auto" height={887} src={taskHiveLogo} width={1774} />
          <span>© 2026 TaskHive. All rights reserved.</span>
          <Clock3 aria-hidden="true" className="hidden h-4 w-4" />
          <CheckCircle2 aria-hidden="true" className="hidden h-4 w-4" />
        </p>
      </div>
    </footer>
  );
}
