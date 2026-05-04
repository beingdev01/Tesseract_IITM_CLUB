interface ToggleSwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  ariaLabel?: string;
}

export function ToggleSwitch({ checked, onChange, disabled = false, ariaLabel }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      aria-disabled={disabled}
      disabled={disabled}
      data-on={checked ? 'true' : 'false'}
      onClick={() => !disabled && onChange(!checked)}
      className="lb-toggle"
    />
  );
}

interface ToggleRowProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}

export function ToggleRow({ label, description, checked, onChange, disabled = false }: ToggleRowProps) {
  return (
    <div className="lb-toggle-row">
      <div>
        <div className="lb-toggle-label">{label}</div>
        {description ? <div className="lb-toggle-desc">{description}</div> : null}
      </div>
      <ToggleSwitch checked={checked} onChange={onChange} disabled={disabled} ariaLabel={label} />
    </div>
  );
}
