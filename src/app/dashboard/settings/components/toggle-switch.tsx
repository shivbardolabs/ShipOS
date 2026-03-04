'use client';

export interface ToggleSwitchProps {
  checked: boolean;
  onChange: (val: boolean) => void;
  label?: string;
  description?: string;
}

export function ToggleSwitch({ checked, onChange, label, description }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3 w-full text-left"
    >
      <div
        className={`relative flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
          checked ? 'bg-primary-600' : 'bg-surface-700'
        }`}
      >
        <div
          className={`h-4 w-4 rounded-full bg-white transition-transform shadow-sm ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </div>
      {(label || description) && (
        <div>
          {label && <span className="text-sm text-surface-200">{label}</span>}
          {description && <p className="text-xs text-surface-500">{description}</p>}
        </div>
      )}
    </button>
  );
}
