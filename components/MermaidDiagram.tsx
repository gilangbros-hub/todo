'use client';

import { useEffect, useRef, useState } from 'react';

interface MermaidDiagramProps {
  code: string;
}

export default function MermaidDiagram({ code }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    if (!code || !containerRef.current) return;

    let cancelled = false;

    const renderDiagram = async () => {
      try {
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: 'dark',
          themeVariables: {
            primaryColor: '#1a1a2e',
            primaryTextColor: '#e2e8f0',
            primaryBorderColor: '#4a5568',
            lineColor: '#718096',
            secondaryColor: '#2d3748',
            tertiaryColor: '#1a202c',
          },
        });

        const id = `mermaid-${Date.now()}`;
        const { svg } = await mermaid.render(id, code);

        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
          setRendered(true);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to render diagram');
          setRendered(false);
        }
      }
    };

    renderDiagram();
    return () => { cancelled = true; };
  }, [code]);

  if (error) {
    return (
      <div>
        <p className="font-retro text-xs text-red-400 mb-2">Diagram render error: {error}</p>
        <pre className="font-retro text-xs text-gray-300 bg-rpg-dark/50 p-3 rounded overflow-x-auto whitespace-pre-wrap">
          {code}
        </pre>
      </div>
    );
  }

  return (
    <div>
      <div
        ref={containerRef}
        className={`overflow-x-auto ${rendered ? '' : 'animate-pulse'}`}
        style={{ minHeight: rendered ? undefined : '200px' }}
      />
      {!rendered && (
        <p className="font-retro text-xs text-gray-500 text-center">Rendering diagram...</p>
      )}
    </div>
  );
}
