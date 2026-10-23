import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { gateMessage } from "@/lib/viewer/presentation";
import type { DenialCode } from "@/lib/domain/access";

/** Explains a blocked action in place, with the next step instead of a dead end. */
export function GateNotice({ code, className }: { code: DenialCode; className?: string }) {
  const message = gateMessage(code);

  return (
    <Card className={className}>
      <CardContent className="grid gap-3 p-5">
        <p className="flex items-center gap-2 text-sm font-bold">
          <LockKeyhole className="h-4 w-4 text-[#D19300] dark:text-[#FFD50D]" />
          {message.title}
        </p>
        <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-300">{message.body}</p>
        <Button asChild className="w-fit" size="sm">
          <Link href={message.action.href}>{message.action.label}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
