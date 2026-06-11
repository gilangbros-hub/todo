/**
 * BRD Oracle — Mermaid diagram sanitizer.
 *
 * LLM-generated Mermaid is frequently broken beyond simple regex fixes:
 * - `ARH(ARH - User)"])` — mismatched delimiters with garbage suffixes
 * - `ARH("['ARH (User")"])` — nested quotes and array syntax
 * - Missing/extra brackets that break the parser
 *
 * Strategy: REBUILD the diagram from scratch.
 * 1. Parse the raw text to extract structure (direction, subgraphs, nodes, edges)
 * 2. Rebuild valid Mermaid from the extracted structure
 * 3. If extraction fails, return a minimal valid diagram
 */

interface ParsedNode {
  id: string;
  label: string;
}

interface ParsedEdge {
  from: string;
  to: string;
  label?: string;
}

interface ParsedSubgraph {
  id: string;
  title: string;
  nodes: ParsedNode[];
}

interface ParsedDiagram {
  direction: string;
  subgraphs: ParsedSubgraph[];
  looseNodes: ParsedNode[];
  edges: ParsedEdge[];
}

/**
 * Main entry point — sanitize LLM Mermaid into something that actually renders.
 */
export function sanitizeMermaid(raw: string): string {
  if (!raw) return '';

  let code = raw.trim();

  // Strip markdown code fences
  code = code
    .replace(/^```(?:mermaid)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  // Try to parse and rebuild
  const parsed = parseDiagram(code);
  if (parsed) {
    return rebuildDiagram(parsed);
  }

  // Fallback: try a simple line-by-line cleanup
  return simpleCleanup(code);
}

/**
 * Parse the raw diagram text into a structured representation.
 */
function parseDiagram(code: string): ParsedDiagram | null {
  const lines = code.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;

  // Extract direction from first line
  let direction = 'TD';
  const dirMatch = lines[0].match(/^(?:graph|flowchart)\s+(TD|TB|BT|LR|RL)/i);
  if (dirMatch) {
    direction = dirMatch[1].toUpperCase();
    lines.shift();
  } else if (/^(?:graph|flowchart)/i.test(lines[0])) {
    lines.shift();
  }

  const subgraphs: ParsedSubgraph[] = [];
  const looseNodes: ParsedNode[] = [];
  const edges: ParsedEdge[] = [];

  let currentSubgraph: ParsedSubgraph | null = null;

  for (const line of lines) {
    // Subgraph start
    const sgMatch = line.match(/^subgraph\s+(\S+?)(?:\[(.+?)\])?\s*$/i) ||
                    line.match(/^subgraph\s+(.+)/i);
    if (sgMatch) {
      const sgId = makeId(sgMatch[1]);
      const sgTitle = sgMatch[2] ? cleanLabel(sgMatch[2]) : cleanLabel(sgMatch[1]);
      currentSubgraph = { id: sgId, title: sgTitle, nodes: [] };
      continue;
    }

    // Subgraph end
    if (/^end\s*$/i.test(line)) {
      if (currentSubgraph) {
        subgraphs.push(currentSubgraph);
        currentSubgraph = null;
      }
      continue;
    }

    // Edge: A -->|"label"| B  or  A --> B  or  A -->|label| B
    const edgeMatch = line.match(
      /^([A-Za-z_][A-Za-z0-9_]*)\s*(-+>|=+>|-.->|--+|=+=)\s*(?:\|"?(.+?)"?\|\s*)?([A-Za-z_][A-Za-z0-9_]*)\s*$/
    ) || line.match(
      /^([A-Za-z_][A-Za-z0-9_]*)\s*(-+>|=+>|-.->|--+|=+=)\s*([A-Za-z_][A-Za-z0-9_]*)\s*$/
    );
    if (edgeMatch) {
      if (edgeMatch.length === 5) {
        edges.push({ from: edgeMatch[1], to: edgeMatch[4], label: edgeMatch[3] ? cleanLabel(edgeMatch[3]) : undefined });
      } else {
        edges.push({ from: edgeMatch[1], to: edgeMatch[3] });
      }
      continue;
    }

    // Edge with label after target: A -->|"label"| B (alternate regex)
    const edgeAlt = line.match(
      /^([A-Za-z_][A-Za-z0-9_]*)\s*-->?\s*\|"?(.+?)"?\|\s*([A-Za-z_][A-Za-z0-9_]*)\s*$/
    );
    if (edgeAlt) {
      edges.push({ from: edgeAlt[1], to: edgeAlt[3], label: cleanLabel(edgeAlt[2]) });
      continue;
    }

    // Node definition: ID[Label] or ID(Label) or ID{Label} etc.
    // Be very permissive about what's inside the brackets — we'll clean it
    const nodeMatch = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*[\[({](.+)/);
    if (nodeMatch) {
      const nodeId = nodeMatch[1];
      // Extract label — take everything after the opener, strip closers and garbage
      const rawLabel = nodeMatch[2];
      const label = cleanLabel(rawLabel);
      const node: ParsedNode = { id: nodeId, label: label || nodeId };

      if (currentSubgraph) {
        currentSubgraph.nodes.push(node);
      } else {
        looseNodes.push(node);
      }
      continue;
    }

    // Plain node ID (no shape)
    const plainNode = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*$/);
    if (plainNode) {
      const node: ParsedNode = { id: plainNode[1], label: plainNode[1] };
      if (currentSubgraph) {
        currentSubgraph.nodes.push(node);
      } else {
        looseNodes.push(node);
      }
    }
  }

  // If we were still in a subgraph (missing `end`), close it
  if (currentSubgraph) {
    subgraphs.push(currentSubgraph);
  }

  // Must have at least some content
  if (subgraphs.length === 0 && looseNodes.length === 0 && edges.length === 0) {
    return null;
  }

  return { direction, subgraphs, looseNodes, edges };
}

/**
 * Rebuild a clean, valid Mermaid diagram from parsed structure.
 */
function rebuildDiagram(parsed: ParsedDiagram): string {
  const lines: string[] = [];
  lines.push(`graph ${parsed.direction}`);

  for (const sg of parsed.subgraphs) {
    lines.push(`    subgraph ${sg.id}["${escapeMermaid(sg.title)}"]`);
    for (const node of sg.nodes) {
      lines.push(`        ${node.id}["${escapeMermaid(node.label)}"]`);
    }
    lines.push('    end');
  }

  for (const node of parsed.looseNodes) {
    lines.push(`    ${node.id}["${escapeMermaid(node.label)}"]`);
  }

  for (const edge of parsed.edges) {
    if (edge.label) {
      lines.push(`    ${edge.from} -->|"${escapeMermaid(edge.label)}"| ${edge.to}`);
    } else {
      lines.push(`    ${edge.from} --> ${edge.to}`);
    }
  }

  return lines.join('\n');
}

/**
 * Clean a raw label string extracted from broken Mermaid.
 * Strips all delimiter garbage, quotes, brackets, etc.
 */
function cleanLabel(raw: string): string {
  let text = raw;

  // Remove all types of closing delimiters and trailing garbage
  text = text.replace(/[\])}]+["'`\])}]*\s*$/g, '');

  // Remove leading/trailing quotes
  text = text.replace(/^["'`\[({]+/g, '');
  text = text.replace(/["'`\])}]+$/g, '');

  // Remove array-like wrappers
  text = text.replace(/^\[['"]?/g, '');
  text = text.replace(/['"]?\]$/g, '');

  // Remove remaining quotes
  text = text.replace(/["'`]/g, '');

  // Replace parentheses with dashes
  text = text.replace(/\s*\(\s*/g, ' - ').replace(/\s*\)\s*/g, ' ');

  // Remove other problematic chars
  text = text.replace(/[[\]{}<>#;|\\]/g, '');

  // Collapse whitespace and trim
  text = text.replace(/\s+/g, ' ').trim();

  // Remove trailing dashes
  text = text.replace(/[\s\-]+$/, '').trim();

  return text;
}

/**
 * Make a valid Mermaid node ID from arbitrary text.
 */
function makeId(raw: string): string {
  // Strip quotes and brackets
  let id = raw.replace(/["'`\[\](){}]/g, '').trim();
  // Replace spaces/special chars with underscore
  id = id.replace(/[^A-Za-z0-9_]/g, '_');
  // Ensure starts with letter
  if (!/^[A-Za-z_]/.test(id)) id = 'N_' + id;
  return id || 'Node';
}

/**
 * Escape text for use inside Mermaid quoted strings.
 */
function escapeMermaid(text: string): string {
  return text.replace(/"/g, "'").replace(/\\/g, '');
}

/**
 * Simple line-by-line cleanup as a last resort before the component's
 * stripAllShapes fallback kicks in.
 */
function simpleCleanup(code: string): string {
  return code
    .split('\n')
    .map((line) => {
      // Fix obvious garbage after closing delimiters: `]")` → `]`
      let fixed = line.replace(/(\])["'`\])}]+/g, '$1');
      fixed = fixed.replace(/(\))["'`\])}]+/g, '$1');
      fixed = fixed.replace(/(\})["'`\])}]+/g, '$1');
      return fixed;
    })
    .join('\n');
}
