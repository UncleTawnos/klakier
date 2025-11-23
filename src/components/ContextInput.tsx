interface Props {
  value: string;
  onChange: (value: string) => void;
}

export function ContextInput({ value, onChange }: Props) {
  return (
    <div className="form-group">
      <label htmlFor="context">Context</label>
      <textarea
        id="context"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Enter context information"
        rows={4}
      />
    </div>
  );
}
