'use client';

import { useEffect, useRef, useState } from 'react';
import { sanitizeMermaid } from '@/lib/brd/mermaid';

interface MermaidDiagramProps {
  code: string;
}

/**
 * Last-resort fallback: strip ALL shape delimiters from node definitions,
 * leaving only plain node IDs. This produces a valid (if ugly) diagram.
 */
function stripAllShapes(code: string): string {
  // Replace NodeID[...], NodeID(...), NodeID{...} etc. with just NodeID
  return code.replace(
    /([A-Za-z_][A-Za-z0-9_]*)\s*(?:\[\[.*?\]\]|\(\[.*?\]\)|\[\(.*?\)\]|\(\(.*?\)\)|\{\{.*?\}\}|\[.*?\]|\(.*?\)|\{.*?\})/g,
    '$1'
  );
}

export default function MermaidDiagram({ code }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [rendered, setRendered] = useState(false);
  const [sanitizedCode, setSanitizedCode] = useState('');

  useEffect(() => {
    if (!code || !containerRef.current) return;

    let cancelled = false;

    const renderDiagram = async () => {
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

      // Attempt 1: sanitized code
      const safeCode = sanitizeMermaid(code);
      setSanitizedCode(safeCode);

      try {
        const id = `mermaid-${Date.now()}`;
        const { svg } = await mermaid.render(id, safeCode);
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
          setRendered(true);
          setError(null);
        }
        return;
      } catch {
        // Attempt 1 failed — try stripping all shapes
      }

      // Attempt 2: strip all node shapes (plain IDs only)
      const strippedCode = stripAllShapes(safeCode);
      try {
        const id2 = `mermaid-fallback-${Date.now()}`;
        const { svg } = await mermaid.render(id2, strippedCode);
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
          setRendered(true);
          setError(null);
        }
        return;
      } catch {
        // Both attempts failed
      }

      // Final fallback: show as formatted code
      if (!cancelled) {
        setError('Diagram could not be rendered (malformed Mermaid syntax from LLM)');
        setRendered(false);
      }
    };

    renderDiagram();
    return () => { cancelled = true; };
  }, [code]);

  if (error) {
    return (
      <div>
        <p className="font-retro text-xs text-yellow-400 mb-2">
          ⚠ {error}
        </p>
        <p className="font-retro text-[10px] text-gray-500 mb-2">
          Re-analyze the document to regenerate the diagram with improved formatting rules.
        </p>
        <pre className="font-retro text-xs text-gray-300 bg-rpg-dark/50 p-3 rounded overflow-x-auto whitespace-pre-wrap max-h-64 overflow-y-auto">
          {sanitizedCode || code}
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
