'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { BrdDocument, BrdFeature } from '@/lib/types';
import { AnalysisExtras } from '@/lib/oracle/types';
import { getBrdDocuments, getBrdFeatures } from '@/lib/services/brd';

export interface OracleContextValue {
  activeDocument: BrdDocument | null;
  features: BrdFeature[];
  extras: AnalysisExtras;
  isAnalyzing: boolean;
  isLoaded: boolean;
  setActiveDocument: (doc: BrdDocument | null) => void;
  refreshData: () => Promise<void>;
}

const defaultExtras: AnalysisExtras = {
  flow_process: [],
  improvements: [],
  questions: [],
  risk_analysis: [],
  architecture_diagram: '',
  impacted_systems: [],
  fsd_design: [],
};

const OracleContext = createContext<OracleContextValue | null>(null);

/**
 * Safely parse a JSON field from BrdDocument into a typed array.
 * Handles null/undefined, already-parsed arrays, and JSON strings.
 */
function safeParseArray<T>(value: unknown): T[] {
  if (!value) return [];
  if (Array.isArray(value)) return value as T[];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Safely parse a string field (e.g., architecture_diagram).
 */
function safeParseString(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
}

/**
 * Extract typed AnalysisExtras from a BrdDocument's raw fields.
 */
function parseExtras(doc: BrdDocument | null): AnalysisExtras {
  if (!doc) return defaultExtras;

  return {
    flow_process: safeParseArray(doc.flow_process),
    improvements: safeParseArray(doc.improvements),
    questions: safeParseArray(doc.questions),
    risk_analysis: safeParseArray(doc.risk_analysis),
    architecture_diagram: safeParseString(doc.architecture_diagram),
    impacted_systems: safeParseArray(doc.impacted_systems),
    fsd_design: safeParseArray(doc.fsd_design),
  };
}

interface OracleProviderProps {
  children: ReactNode;
}

export function OracleProvider({ children }: OracleProviderProps) {
  const [activeDocument, setActiveDocument] = useState<BrdDocument | null>(null);
  const [features, setFeatures] = useState<BrdFeature[]>([]);
  const [extras, setExtras] = useState<AnalysisExtras>(defaultExtras);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Fetch the most recent BRD document on mount
  useEffect(() => {
    async function loadInitialDocument() {
      try {
        const documents = await getBrdDocuments();
        if (documents.length > 0) {
          const mostRecent = documents[0]; // Already sorted by created_at desc
          setActiveDocument(mostRecent);
          setIsAnalyzing(mostRecent.analysis_status === 'analyzing');
        }
      } catch (error) {
        console.error('Failed to load BRD documents:', error);
      } finally {
        setIsLoaded(true);
      }
    }

    loadInitialDocument();
  }, []);

  // Fetch features and parse extras when activeDocument changes
  useEffect(() => {
    if (!activeDocument) {
      setFeatures([]);
      setExtras(defaultExtras);
      setIsAnalyzing(false);
      return;
    }

    setIsAnalyzing(activeDocument.analysis_status === 'analyzing');
    setExtras(parseExtras(activeDocument));

    async function loadFeatures() {
      try {
        const docFeatures = await getBrdFeatures(activeDocument!.id);
        setFeatures(docFeatures);
      } catch (error) {
        console.error('Failed to load BRD features:', error);
        setFeatures([]);
      }
    }

    loadFeatures();
  }, [activeDocument]);

  // Refresh data: re-fetch documents and features
  const refreshData = useCallback(async () => {
    try {
      const documents = await getBrdDocuments();
      if (documents.length > 0) {
        const mostRecent = documents[0];
        setActiveDocument(mostRecent);
        setIsAnalyzing(mostRecent.analysis_status === 'analyzing');
        setExtras(parseExtras(mostRecent));

        const docFeatures = await getBrdFeatures(mostRecent.id);
        setFeatures(docFeatures);
      } else {
        setActiveDocument(null);
        setFeatures([]);
        setExtras(defaultExtras);
        setIsAnalyzing(false);
      }
    } catch (error) {
      console.error('Failed to refresh Oracle data:', error);
    }
  }, []);

  return (
    <OracleContext.Provider
      value={{
        activeDocument,
        features,
        extras,
        isAnalyzing,
        isLoaded,
        setActiveDocument,
        refreshData,
      }}
    >
      {children}
    </OracleContext.Provider>
  );
}

/**
 * Hook to access Oracle context. Must be used within an OracleProvider.
 */
export function useOracle(): OracleContextValue {
  const context = useContext(OracleContext);
  if (!context) {
    throw new Error('useOracle must be used within an OracleProvider');
  }
  return context;
}
