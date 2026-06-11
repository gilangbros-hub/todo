/**
 * BRD Oracle — Token quality / repetition-loop guard for streaming LLM output.
 *
 * LLMs (especially reasoning models) sometimes fall into degenerate loops where
 * they emit the same token or short phrase over and over — e.g.
 * "app app app app..." or "from from from-to-to-to the the the". This produces
 * garbage reasoning/content and wastes the entire request.
 *
 * The guard watches a sliding window of the most recent text and flags when the
 * stream becomes pathologically repetitive so the caller can abort and retry
 * with stricter sampling settings.
 */

export interface RepetitionGuardOptions {
  /** How many trailing characters to keep in the sliding window. */
  windowChars?: number;
  /** Run a check only after at least this many new chars have arrived. */
  checkEvery?: number;
  /** Minimum word count in the window before lexical checks apply. */
  minWords?: number;
  /** Below this unique/total word ratio the window is considered degenerate. */
  uniqueRatio?: number;
  /** A single word repeated consecutively this many times triggers detection. */
  maxRunRepeat?: number;
}

export class RepetitionGuard {
  private buffer = '';
  private sinceLastCheck = 0;

  private readonly windowChars: number;
  private readonly checkEvery: number;
  private readonly minWords: number;
  private readonly uniqueRatio: number;
  private readonly maxRunRepeat: number;

  constructor(opts: RepetitionGuardOptions = {}) {
    this.windowChars = opts.windowChars ?? 400;
    this.checkEvery = opts.checkEvery ?? 80;
    this.minWords = opts.minWords ?? 24;
    this.uniqueRatio = opts.uniqueRatio ?? 0.18;
    this.maxRunRepeat = opts.maxRunRepeat ?? 10;
  }

  /**
   * Feed a chunk of streamed text. Returns true once a repetition loop is
   * detected (throttled — only re-checks every `checkEvery` characters).
   */
  push(chunk: string): boolean {
    if (!chunk) return false;

    this.buffer += chunk;
    if (this.buffer.length > this.windowChars) {
      this.buffer = this.buffer.slice(-this.windowChars);
    }

    this.sinceLastCheck += chunk.length;
    if (this.sinceLastCheck < this.checkEvery) return false;
    this.sinceLastCheck = 0;

    return this.isDegenerate();
  }

  private isDegenerate(): boolean {
    const text = this.buffer.trim();
    if (text.length < 80) return false;

    const words = text.split(/\s+/).filter(Boolean);

    if (words.length >= this.minWords) {
      // 1. Consecutive identical-word run, e.g. "app app app app..."
      let run = 1;
      let maxRun = 1;
      for (let i = 1; i < words.length; i++) {
        if (normalize(words[i]) === normalize(words[i - 1])) {
          run++;
          if (run > maxRun) maxRun = run;
        } else {
          run = 1;
        }
      }
      if (maxRun >= this.maxRunRepeat) return true;

      // 2. Low lexical diversity across the window, e.g. a handful of words
      //    cycling endlessly ("process process need need process process...").
      const unique = new Set(words.map(normalize)).size;
      if (unique / words.length < this.uniqueRatio) return true;
    }

    // 3. Short token cycling without spaces, e.g. "to-to-to-to-to".
    if (hasShortRepeatingPattern(text)) return true;

    return false;
  }
}

function normalize(word: string): string {
  return word.toLowerCase().replace(/[^a-z0-9]/gi, '');
}

/**
 * Detects a short unit (1-4 chars) repeated back-to-back many times within the
 * tail of the window — catches dash/punctuation loops like "to-to-to-to".
 */
function hasShortRepeatingPattern(text: string): boolean {
  const tail = text.slice(-120).replace(/\s+/g, ' ');
  for (let unit = 1; unit <= 4; unit++) {
    const seg = tail.slice(-unit);
    if (!seg.trim()) continue;
    let repeats = 0;
    for (let i = tail.length - unit; i >= 0; i -= unit) {
      if (tail.slice(i, i + unit) === seg) repeats++;
      else break;
    }
    if (repeats >= 12) return true;
  }
  return false;
}
