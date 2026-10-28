import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "quiet" };

const BUTTON_STYLES = {
  primary: "bg-primary text-heading hover:bg-gold-bright",
  secondary: "border border-gold-deep bg-white text-heading hover:bg-cream",
  quiet: "text-heading underline underline-offset-4 hover:text-gold-deep",
};

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  return (
    <button
      type="button"
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-5 py-2.5 font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${BUTTON_STYLES[variant]} ${className}`}
      {...props}
    />
  );
}

type FieldProps = InputHTMLAttributes<HTMLInputElement> & { id: string; label: string; error?: string; hint?: string };

export function TextField({ id, label, error, hint, className = "", ...input }: FieldProps) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label htmlFor={id} className="text-sm font-medium text-heading">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className="min-h-11 rounded-lg border border-body/40 bg-white px-3 text-heading placeholder:text-body/60 aria-invalid:border-error-on-cream"
        {...input}
      />
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-body">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-sm text-error-on-cream">
          {error}
        </p>
      )}
    </div>
  );
}

type Chip = { value: string; label: string; disabledReason?: string };

export function ChipGroup({ label, chips, selected, onToggle }: { label: string; chips: Chip[]; selected: string[]; onToggle: (value: string) => void }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {chips.map((chip) => {
        const on = selected.includes(chip.value);
        return (
          <button
            key={chip.value}
            type="button"
            aria-pressed={on}
            disabled={Boolean(chip.disabledReason)}
            title={chip.disabledReason}
            onClick={() => onToggle(chip.value)}
            className={`min-h-11 rounded-full border px-3.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
              on ? "border-gold-deep bg-primary text-heading" : "border-body/40 bg-white text-heading hover:border-gold-deep"
            }`}
          >
            {on ? "✓ " : ""}
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}

export function Notice({ tone, children }: { tone: "error" | "warning" | "info" | "success"; children: ReactNode }) {
  const styles = {
    error: "border-error bg-error/5 text-error-on-cream",
    warning: "border-gold-deep bg-primary/10 text-heading",
    info: "border-body/30 bg-white text-body",
    success: "border-success bg-success/5 text-success-on-cream",
  };
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`rounded-lg border-l-4 px-4 py-3 text-sm ${styles[tone]}`}>
      {children}
    </div>
  );
}

export function StepHeading({ id, title, subtitle }: { id?: string; title: string; subtitle?: ReactNode }) {
  return (
    <div className="space-y-1">
      <h3 id={id} className="font-serif text-2xl font-semibold text-heading sm:text-3xl">
        {title}
      </h3>
      {subtitle && <p className="text-sm text-body">{subtitle}</p>}
    </div>
  );
}
