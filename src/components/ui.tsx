import {
  cloneElement,
  isValidElement,
  useId,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";
import * as Switch from "@radix-ui/react-switch";
import * as Dialog from "@radix-ui/react-dialog";
import * as Slot from "@radix-ui/react-slot";
import { AlertTriangle, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toneStyle, type Tone } from "@/lib/tones";

export type ButtonStatus = "idle" | "loading" | "success" | "error";

export type ButtonTone = "primary" | "quiet" | "ghost" | "danger";

const SIZES = {
  sm: "h-11 min-w-11 px-3 text-sm",
  md: "h-12 min-w-12 px-4 text-sm",
  lg: "h-14 min-w-14 px-6 text-base",
} as const;

/** Superficies por tono (definidas en `styles.css`, capa `components`). */
const TONES = {
  primary: "btn-primary sheen",
  quiet: "btn-quiet",
  ghost: "btn-ghost",
  danger: "btn-danger",
} as const;

const STATUS_MESSAGE: Record<Exclude<ButtonStatus, "idle">, string> = {
  loading: "Trabajando…",
  success: "Listo",
  error: "No se pudo completar",
};

/**
 * Botón con microinteracciones coherentes:
 * - objetivos táctiles cómodos (44 px o más) y `touch-action: manipulation`;
 * - hundimiento al presionar (`.press`), elevación sutil con ratón (`.lift`) y brillo (`.sheen`);
 * - foco visible y estado `disabled` distinguible;
 * - estados `loading` (spinner + `aria-busy`, evita envíos duplicados),
 *   `success` (palomita breve) y `error` (sacudida discreta + icono, sin
 *   depender solo del color), anunciados también con `role="status"`;
 * - `asChild` permite que una navegación conserve semántica de enlace y no
 *   acabe con un `<button>` interactivo anidado dentro de un `<a>`.
 */
export function Button({
  className,
  tone = "primary",
  type = "button",
  status = "idle",
  size = "md",
  asChild = false,
  children,
  disabled: userDisabled,
  onClick,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: ButtonTone;
  /** Estado visual del botón. `loading` también lo deshabilita. */
  status?: ButtonStatus;
  size?: keyof typeof SIZES;
  /** Renderiza el estilo sobre el hijo (p. ej. un Link), conservando su semántica. */
  asChild?: boolean;
}) {
  const loading = status === "loading";
  const disabled = userDisabled || loading;
  const buttonClass = cn(
    "press lift relative inline-flex items-center justify-center gap-2 rounded-xl font-medium",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-soft",
    "disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none",
    "aria-disabled:cursor-not-allowed aria-disabled:pointer-events-none aria-disabled:opacity-45 aria-disabled:shadow-none",
    SIZES[size],
    TONES[tone],
    status === "error" && "shake",
    className,
  );
  const statusIcon = loading ? (
    <Loader2 size={16} aria-hidden className="shrink-0 animate-spin" />
  ) : status === "success" ? (
    <Check size={16} aria-hidden className="shrink-0 animate-in zoom-in-50 duration-200" />
  ) : status === "error" ? (
    <AlertTriangle size={16} aria-hidden className="shrink-0" />
  ) : null;
  const errorLabel =
    status === "error" ? (
      <span className="relative z-2 text-xs font-semibold">Error</span>
    ) : null;
  const contents = (
    <>
      {statusIcon}
      <span className="relative z-2 min-w-0">{children}</span>
      {errorLabel}
    </>
  );
  const slottedChild = isValidElement<{ children?: ReactNode }>(children)
    ? cloneElement(
        children,
        undefined,
        <span className="relative z-2 min-w-0">{children.props.children}</span>,
      )
    : children;
  const announcement = (
    <span role="status" className="sr-only">
      {status === "idle" ? "" : STATUS_MESSAGE[status]}
    </span>
  );

  if (asChild) {
    return (
      <>
        <Slot.Root
          {...props}
          aria-busy={loading || props["aria-busy"] || undefined}
          aria-disabled={disabled || props["aria-disabled"] || undefined}
          tabIndex={disabled ? -1 : props.tabIndex}
          onClick={(event) => {
            if (disabled) {
              event.preventDefault();
              event.stopPropagation();
              return;
            }
            onClick?.(event as ReactMouseEvent<HTMLButtonElement>);
          }}
          className={buttonClass}
        >
          {statusIcon}
          <Slot.Slottable>{slottedChild}</Slot.Slottable>
          {errorLabel}
        </Slot.Root>
        {announcement}
      </>
    );
  }

  return (
    <>
      <button
        {...props}
        type={type}
        aria-busy={loading || props["aria-busy"] || undefined}
        onClick={onClick}
        disabled={disabled}
        className={buttonClass}
      >
        {contents}
      </button>
      {announcement}
    </>
  );
}

/** Botón cuadrado de icono (flechas de mes, cerrar, campana…). 44 × 44 px. */
export function IconButton({
  className,
  label,
  tone = "quiet",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  tone?: ButtonTone;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      {...props}
      className={cn(
        "press lift grid size-11 shrink-0 place-items-center rounded-full",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-soft",
        "disabled:cursor-not-allowed disabled:opacity-40",
        TONES[tone],
        className,
      )}
    >
      {children}
    </button>
  );
}

type FieldControlProps = {
  id?: string;
  "aria-describedby"?: string;
};

export function Field({
  label,
  hint,
  children,
  tone,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  tone?: Tone;
}) {
  const id = useId();
  const child = isValidElement<FieldControlProps>(children) ? children : null;
  const controlId = child?.props.id ?? id;
  const hintId = hint ? `${id}-hint` : undefined;
  const describedBy = [child?.props["aria-describedby"], hintId].filter(Boolean).join(" ");
  const control = child
    ? cloneElement(child, {
        id: controlId,
        "aria-describedby": describedBy || undefined,
      })
    : children;

  return (
    <div className="block">
      <label
        htmlFor={controlId}
        className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-fg/85"
      >
        {label}
      </label>
      {control}
      {hint ? (
        <span
          id={hintId}
          className={cn("mt-1.5 block text-xs", tone === "crimson" ? "text-crimson" : "text-muted")}
        >
          {hint}
        </span>
      ) : null}
    </div>
  );
}

const control = "control h-12 px-3.5 text-base";

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(control, props.className)} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea {...props} className={cn(control, "h-24 resize-none py-3", props.className)} />
  );
}

export function Toggle({
  checked,
  onCheckedChange,
  label,
  hint,
  disabled,
  tone = "sage",
  icon,
}: {
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  label: string;
  hint?: ReactNode;
  disabled?: boolean;
  /** Color del riel y del interruptor cuando está encendido. */
  tone?: Tone;
  icon?: ReactNode;
}) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div
      className={cn(
        "rail card flex items-center justify-between gap-4 px-4 py-3 transition-colors duration-200",
        checked ? "" : "opacity-90",
      )}
      style={toneStyle(checked ? tone : "muted")}
    >
      <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer">
        <span className="flex items-center gap-2 text-sm font-medium break-words text-fg">
          {icon}
          {label}
        </span>
        {hint ? (
          <span id={hintId} className="mt-0.5 block text-xs text-muted">
            {hint}
          </span>
        ) : null}
      </label>
      {/* El área táctil del interruptor mide 48 px de alto aunque se vea más chico. */}
      <span className="-m-2 grid shrink-0 place-items-center p-2">
        <Switch.Root
          id={id}
          checked={checked}
          onCheckedChange={onCheckedChange}
          disabled={disabled}
          aria-label={label}
          aria-describedby={hintId}
          className={cn(
            "press relative h-8 w-14 rounded-full border transition-colors duration-200",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-soft",
            "disabled:cursor-not-allowed disabled:opacity-50",
            checked ? "switch-on" : "border-line bg-bg",
          )}
          style={toneStyle(tone)}
        >
          <Switch.Thumb
            className={cn(
              "thumb block size-6 translate-x-1 rounded-full bg-fg shadow-md transition-transform duration-200 ease-out",
              "data-[state=checked]:translate-x-7 data-[state=checked]:bg-[#1a120e]",
            )}
          />
        </Switch.Root>
      </span>
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
        <Dialog.Overlay className="fixed inset-0 z-40 bg-bg-deep/75 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          className="card card-hero fixed top-1/2 left-1/2 z-50 w-[min(100%-2rem,28rem)] -translate-x-1/2 -translate-y-1/2 p-5 shadow-2xl data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
        >
          <span aria-hidden className="tile mb-3 size-10" style={toneStyle("crimson")}>
            <AlertTriangle size={18} />
          </span>
          <Dialog.Title className="font-display text-2xl text-fg">{title}</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-muted">
            {body}
          </Dialog.Description>
          <div className="mt-5 flex gap-2">
            <Dialog.Close asChild>
              <Button tone="quiet" className="flex-1">
                Cancelar
              </Button>
            </Dialog.Close>
            <Button
              tone="danger"
              className="flex-1"
              onClick={onConfirm}
              status={pending ? "loading" : "idle"}
            >
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
    <div className="card spotlight relative overflow-hidden px-5 py-10 text-center">
      {/* Resplandor decorativo detrás del dibujo */}
      <span
        aria-hidden
        className="pointer-events-none absolute -top-16 left-1/2 size-52 -translate-x-1/2 rounded-full bg-accent/18 blur-3xl"
      />
      {icon ? (
        <span className="relative mb-4 inline-grid size-16 place-items-center rounded-2xl border border-accent/35 bg-accent/12 text-accent float">
          {icon}
        </span>
      ) : null}
      <h2 className="relative font-display text-2xl text-fg">{title}</h2>
      <p className="relative mx-auto mt-2 max-w-sm text-sm text-muted">{body}</p>
      {action ? <div className="relative mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}
