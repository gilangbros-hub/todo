'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { sanitizeMermaid } from '@/lib/brd/mermaid';
import { OracleIcon } from './OracleIcon';

interface ArchitectureCanvasProps {
  diagramCode: string;
  onNodeClick?: (nodeId: string) => void;
}

/**
 * Last-resort fallback: strip ALL shape delimiters from node definitions,
 * leaving only plain node IDs. Produces a valid (if ugly) diagram.
 */
function stripAllShapes(code: string): string {
  return code.replace(
    /([A-Za-z_][A-Za-z0-9_]*)\s*(?:\[\[.*?\]\]|\(\[.*?\]\)|\[\(.*?\)\]|\(\(.*?\)\)|\{\{.*?\}\}|\[.*?\]|\(.*?\)|\{.*?\})/g,
    '$1'
  );
}

export function ArchitectureCanvas({ diagramCode }: ArchitectureCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const renderTargetRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [rendered, setRendered] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sanitizedCode, setSanitizedCode] = useState('');

  // Render the Mermaid diagram with Oracle theme
  useEffect(() => {
    if (!diagramCode || !renderTargetRef.current) return;

    let cancelled = false;

    const renderDiagram = async () => {
      const mermaid = (await import('mermaid')).default;
      mermaid.initialize({
        startOnLoad: false,
        theme: 'dark',
        themeVariables: {
          // Oracle theme palette
          primaryColor: '#201e1a', // oracle-panel
          primaryTextColor: '#e6e2de', // oracle-text
          primaryBorderColor: '#ecc14f', // oracle-gold
          lineColor: '#9a907c', // oracle-muted
          secondaryColor: '#1a1815', // oracle-card
          tertiaryColor: '#141210', // oracle-stone
          fontFamily: 'Inter, sans-serif',
          clusterBkg: '#141210',
          clusterBorder: 'rgba(200, 169, 110, 0.18)',
          titleColor: '#ecc14f',
          edgeLabelBackground: '#141311',
          nodeTextColor: '#e6e2de',
        },
      });

      const safeCode = sanitizeMermaid(diagramCode);
      setSanitizedCode(safeCode);

      // Attempt 1: sanitized code
      try {
        const id = `oracle-mermaid-${Date.now()}`;
        const { svg } = await mermaid.render(id, safeCode);
        if (!cancelled && renderTargetRef.current) {
          renderTargetRef.current.innerHTML = svg;
          setRendered(true);
          setError(null);
        }
        return;
      } catch {
        // fall through to attempt 2
      }

      // Attempt 2: strip all node shapes
      try {
        const id2 = `oracle-mermaid-fallback-${Date.now()}`;
        const { svg } = await mermaid.render(id2, stripAllShapes(safeCode));
        if (!cancelled && renderTargetRef.current) {
          renderTargetRef.current.innerHTML = svg;
          setRendered(true);
          setError(null);
        }
        return;
      } catch {
        // both attempts failed
      }

      if (!cancelled) {
        setError('Diagram could not be rendered (malformed Mermaid syntax).');
        setRendered(false);
      }
    };

    renderDiagram();
    return () => {
      cancelled = true;
    };
  }, [diagramCode]);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setTransform((prev) => ({
      ...prev,
      scale: Math.min(Math.max(prev.scale + delta, 0.3), 3),
    }));
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setTransform((prev) => ({
      ...prev,
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    }));
  };

  const handleMouseUp = () => setIsDragging(false);

  const zoomIn = () =>
    setTransform((prev) => ({ ...prev, scale: Math.min(prev.scale + 0.2, 3) }));
  const zoomOut = () =>
    setTransform((prev) => ({ ...prev, scale: Math.max(prev.scale - 0.2, 0.3) }));
  const resetView = () => setTransform({ x: 0, y: 0, scale: 1 });

  return (
    <div className="relative w-full h-[600px] bg-oracle-deepest border border-oracle-border rounded-lg overflow-hidden">
      {/* Tactical grid backdrop */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(200,169,110,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(200,169,110,0.4) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Canvas area */}
      <div
        ref={containerRef}
        className={`w-full h-full ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          className="w-full h-full flex items-center justify-center"
          style={{
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
          }}
        >
          {/* Mermaid render target */}
          <div
            ref={renderTargetRef}
            className={`[&_svg]:max-w-none ${rendered ? '' : 'hidden'}`}
          />

          {/* Loading state */}
          {!rendered && !error && (
            <div className="flex flex-col items-center gap-3 text-oracle-muted">
              <OracleIcon name="hub" size={48} className="text-oracle-gold/40 animate-pulse" />
              <p className="font-oracle-mono text-sm">Charting topology...</p>
            </div>
          )}

          {/* Error fallback — show raw code */}
          {error && (
            <div className="max-w-2xl p-4">
              <p className="font-oracle-mono text-xs text-oracle-high mb-2">⚠ {error}</p>
              <pre className="font-oracle-mono text-xs text-oracle-muted bg-oracle-stone p-4 rounded border border-oracle-border overflow-x-auto whitespace-pre-wrap max-h-80 overflow-y-auto">
                {sanitizedCode || diagramCode}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* Zoom Controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2">
        <button
          onClick={zoomIn}
          className="w-9 h-9 bg-oracle-card border border-oracle-border rounded flex items-center justify-center text-oracle-text hover:border-oracle-gold/40 hover:text-oracle-gold transition-colors cursor-pointer"
          aria-label="Zoom in"
        >
          <OracleIcon name="add" size={18} />
        </button>
        <button
          onClick={zoomOut}
          className="w-9 h-9 bg-oracle-card border border-oracle-border rounded flex items-center justify-center text-oracle-text hover:border-oracle-gold/40 hover:text-oracle-gold transition-colors cursor-pointer"
          aria-label="Zoom out"
        >
          <OracleIcon name="remove" size={18} />
        </button>
        <button
          onClick={resetView}
          className="w-9 h-9 bg-oracle-card border border-oracle-border rounded flex items-center justify-center text-oracle-text hover:border-oracle-gold/40 hover:text-oracle-gold transition-colors cursor-pointer"
          aria-label="Reset view"
        >
          <OracleIcon name="fit_screen" size={18} />
        </button>
      </div>
    </div>
  );
}
