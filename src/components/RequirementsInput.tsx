import { parseParagraphs } from '../utils/textParser';

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export function RequirementsInput({ value, onChange }: Props) {
  const paragraphCount = parseParagraphs(value).length;

  return (
    <div className="form-group">
      <label htmlFor="requirements">
        Requirements
        {paragraphCount > 0 && (
          <span className="counter">({paragraphCount} items)</span>
        )}
      </label>
      <textarea
        id="requirements"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Enter requirements (separate with blank lines for multiple items)"
        rows={6}
      />
    </div>
  );
}
