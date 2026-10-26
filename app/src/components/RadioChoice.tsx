export function RadioChoice({
  checked,
  title,
  onClick,
}: {
  checked: boolean;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      className={'radio-choice' + (checked ? ' is-selected' : '')}
      type="button"
      aria-pressed={checked}
      onClick={onClick}
    >
      <span className="radio-indicator" aria-hidden="true" />
      <span>{title}</span>
    </button>
  );
}
