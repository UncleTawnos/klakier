import { parseParagraphs } from '../utils/textParser';

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export function TaskInput({ value, onChange }: Props) {
  const paragraphCount = parseParagraphs(value).length;

  return (
    <div className="form-group">
      <label htmlFor="task">
        Task
        {paragraphCount > 0 && (
          <span className="counter">({paragraphCount} items)</span>
        )}
      </label>
      <textarea
        id="task"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Enter task description (separate with blank lines for multiple items)"
        rows={6}
      />
    </div>
  );
}
