import { useState, useEffect, useRef } from 'react';
import { copyToClipboard } from '../utils/clipboard';

interface Props {
  content: string;
}

export function CopyButton({ content }: Props) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleCopy = async () => {
    const success = await copyToClipboard(content);
    if (success) {
      setCopied(true);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = window.setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      className={`copy-button ${copied ? 'copied' : ''}`}
      onClick={handleCopy}
      title="Copy to clipboard"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}
