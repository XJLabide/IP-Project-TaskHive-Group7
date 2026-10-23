"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { fieldClass } from "./field";

type PasswordFieldProps = {
  id: string;
  label: string;
  autoComplete?: "current-password" | "new-password";
  minLength?: number;
  required?: boolean;
};

/** Password input with a reveal control that keeps the value in the same field. */
export function PasswordField({
  id,
  label,
  autoComplete = "new-password",
  minLength,
  required = true,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="grid content-start gap-2">
      <label className="text-sm font-medium dark:text-zinc-200" htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <input
          autoComplete={autoComplete}
          className={cn(fieldClass, "pr-11")}
          id={id}
          minLength={minLength}
          name={id}
          required={required}
          type={visible ? "text" : "password"}
        />
        <button
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-lg text-zinc-500 outline-none transition-colors hover:text-[#D19300] focus-visible:ring-2 focus-visible:ring-[#FFD50D] dark:text-zinc-400 dark:hover:text-[#FFC800]"
          onClick={() => setVisible((current) => !current)}
          type="button"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
