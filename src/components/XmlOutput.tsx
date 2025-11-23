import { Highlight, themes } from 'prism-react-renderer';
import { CopyButton } from './CopyButton';

interface Props {
  xmlContent: string;
}

export function XmlOutput({ xmlContent }: Props) {
  if (!xmlContent) {
    return (
      <div className="xml-output empty">
        <p>Fill in the form to generate XML</p>
      </div>
    );
  }

  return (
    <div className="xml-output">
      <div className="output-header">
        <h3>Generated XML</h3>
        <CopyButton content={xmlContent} />
      </div>
      <Highlight theme={themes.vsDark} code={xmlContent} language="xml">
        {({ style, tokens, getLineProps, getTokenProps }) => (
          <pre style={style}>
            {tokens.map((line, i) => (
              <div key={i} {...getLineProps({ line })}>
                <span className="line-number">{i + 1}</span>
                {line.map((token, key) => (
                  <span key={key} {...getTokenProps({ token })} />
                ))}
              </div>
            ))}
          </pre>
        )}
      </Highlight>
    </div>
  );
}
