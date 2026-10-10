import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from "react";
import * as Switch from "@radix-ui/react-switch";
import * as Dialog from "@radix-ui/react-dialog";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type ButtonStatus = "idle" | "loading" | "success" | "error";

/**
 * Botón con microinteracciones coherentes:
 * - objetivos táctiles cómodos (h-12) y `touch-action: manipulation`;
 * - hundimiento al presionar (`.press`) y elevación sutil solo con ratón (`.lift`);
 * - estados `loading` (spinner + `aria-busy`, evita envíos duplicados),
 *   `success` (palomita breve) y `error` (sacudida discreta, sin depender solo
 *   del color);
 * - foco visible y estado `disabled` distinguible.
 */
export function Button({
  className,
  tone = "primary",
  type = "button",
  status = "idle",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: "primary" | "quiet" | "ghost";
  /** Estado visual del botón. `loading` también lo deshabilita. */
  status?: ButtonStatus;
}) {
  const loading = status === "loading";
  const disabled = props.disabled || loading;
  return (
    <button
      type={type}
      aria-busy={loading || undefined}
      {...props}
      disabled={disabled}
      className={cn(
        "press lift relative inline-flex h-12 min-w-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        "disabled:cursor-not-allowed disabled:opacity-50",
        tone === "primary" && "bg-accent text-accent-fg shadow-lg shadow-accent/20",
        tone === "quiet" && "border border-line bg-raised text-fg",
        tone === "ghost" && "bg-transparent text-muted",
        status === "error" && "shake",
        className,
      )}
    >
      {loading ? (
        <Loader2 size={16} aria-hidden className="animate-spin" />
      ) : status === "success" ? (
        <Check size={16} aria-hidden />
      ) : null}
      {props.children}
    </button>
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
  "h-12 w-full rounded-xl border border-line bg-bg px-3 text-base text-fg outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-muted/70 focus:border-accent focus:shadow-[0_0_0_3px] focus:shadow-accent/25";

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
  disabled,
}: {
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  label: string;
  hint?: string;
  disabled?: boolean;
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
        disabled={disabled}
        aria-label={label}
        className="press relative h-7 w-12 shrink-0 rounded-full border border-line bg-bg transition-colors duration-200 data-[state=checked]:border-accent data-[state=checked]:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
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
        <Dialog.Overlay className="fixed inset-0 z-40 bg-bg/70 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 w-[min(100%-2rem,28rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-line bg-raised p-5 shadow-2xl data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95">
          <Dialog.Title className="font-display text-2xl text-fg">{title}</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-muted">{body}</Dialog.Description>
          <div className="mt-5 flex gap-2">
            <Dialog.Close asChild>
              <Button tone="quiet" className="flex-1">
                Cancelar
              </Button>
            </Dialog.Close>
            <Button className="flex-1" onClick={onConfirm} status={pending ? "loading" : "idle"}>
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
  icon,
}: {
  title: string;
  body: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-line px-5 py-10 text-center">
      {icon ? <div className="mb-3 flex justify-center text-muted">{icon}</div> : null}
      <h2 className="font-display text-2xl text-fg">{title}</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted">{body}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
