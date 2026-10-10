import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from "react";
import * as Switch from "@radix-ui/react-switch";
import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";

export function Button({
  className,
  tone = "primary",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: "primary" | "quiet" | "ghost";
}) {
  return (
    <button
      type={type}
      className={cn(
        "press inline-flex h-12 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        "disabled:cursor-not-allowed disabled:opacity-50",
        tone === "primary" && "bg-accent text-accent-fg",
        tone === "quiet" && "border border-line bg-raised text-fg",
        tone === "ghost" && "bg-transparent text-muted",
        className,
      )}
      {...props}
    />
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-muted">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

const control =
  "h-12 w-full rounded-xl border border-line bg-bg px-3 text-base text-fg outline-none transition-colors duration-200 placeholder:text-muted/70 focus:border-accent";

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(control, props.className)} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(control, "h-24 resize-none py-3", props.className)}
    />
  );
}

export function Toggle({
  checked,
  onCheckedChange,
  label,
  hint,
}: {
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-line bg-raised px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium break-words text-fg">{label}</p>
        {hint ? <p className="text-xs text-muted">{hint}</p> : null}
      </div>
      <Switch.Root
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="press relative h-7 w-12 shrink-0 rounded-full border border-line bg-bg transition-colors duration-200 data-[state=checked]:border-accent data-[state=checked]:bg-accent"
      >
        <Switch.Thumb className="thumb block size-5 translate-x-1 rounded-full bg-fg transition-transform duration-200 ease-out data-[state=checked]:translate-x-6 data-[state=checked]:bg-accent-fg" />
      </Switch.Root>
    </div>
  );
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  body,
  confirmLabel,
  onConfirm,
  pending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  pending?: boolean;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-bg/70" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 w-[min(100%-2rem,28rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-line bg-raised p-5">
          <Dialog.Title className="font-display text-2xl text-fg">{title}</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-muted">{body}</Dialog.Description>
          <div className="mt-5 flex gap-2">
            <Dialog.Close asChild>
              <Button tone="quiet" className="flex-1">
                Cancelar
              </Button>
            </Dialog.Close>
            <Button className="flex-1" onClick={onConfirm} disabled={pending}>
              {pending ? "Un momento…" : confirmLabel}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function Empty({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-line px-5 py-10 text-center">
      <h2 className="font-display text-2xl text-fg">{title}</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted">{body}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
