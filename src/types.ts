
export interface AnalysisChunk {
  text: string;
  grammarDescription: string;
  partOfSpeech: string;
  role: string;
}

export interface DetailedToken {
  text: string;
  partOfSpeech: string;
  role: string;
  explanation: string;
  meaning: string; // New: Contextual meaning
}

export interface CorrectionChange {
  type: 'add' | 'remove' | 'keep';
  text: string;
}

export interface Correction {
  original: string;
  corrected: string;
  errorType: string;
  reason: string;
  changes: CorrectionChange[];
}

export interface AnalysisResult {
  chunks: AnalysisChunk[];
  detailedTokens: DetailedToken[];
  chineseTranslation: string;
  englishSentence: string;
  correction?: Correction;
  sentencePattern?: string; // e.g., "S + V + O"
  mainTense?: string;      // e.g., "Present Perfect"
}

// --- Dictionary Types ---

export interface DictionaryDefinition {
  meaning: string;         // Chinese meaning
  explanation: string;     // English/Chinese explanation
  example: string;         // English example sentence
  exampleTranslation: string; // Chinese translation of example
}

export interface DictionaryCollocation {
  phrase: string;
  meaning: string;
  example: string;
  exampleTranslation: string;
}

export interface DictionaryEntry {
  partOfSpeech: string;    // e.g., "noun", "verb"
  cocaFrequency?: string;  // New: POS-specific frequency, e.g. "Rank 1029"
  definitions: DictionaryDefinition[];
}

export interface DictionaryResult {
  word: string;
  phonetic: string;        // IPA
  entries: DictionaryEntry[];
  collocations?: DictionaryCollocation[];
}

// --- Writing Analysis Types ---

export type WritingMode = 'fix' | 'ielts-5.5' | 'ielts-6.0' | 'ielts-6.5' | 'ielts-7.0' | 'ielts-7.5' | 'ielts-8.0';

export interface WritingSegment {
  type: 'unchanged' | 'change';
  text: string;          // The text to display (corrected version)
  original?: string;     // The original text (if changed)
  reason?: string;       // Why it was changed
  category?: 'grammar' | 'vocabulary' | 'style' | 'collocation' | 'punctuation';
}

export interface WritingResult {
  mode: WritingMode;
  generalFeedback: string;
  segments: WritingSegment[]; // Replaces simple improvedText + suggestions list
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  data?: any;
  type?: 'text' | 'analysis_result' | 'dictionary_result' | 'quick_lookup_result' | 'video_control';
}

// --- Model Configuration ---
export type ModelLevel = 'mini' | 'quick' | 'deep';

// --- Page Mode ---
export type PageMode = 'writing' | 'reading';  // 写作纠错 | 文章精读

// --- Quick Lookup Result ---
export interface QuickLookupResult {
  word: string;
  contextMeaning: string;  // 在此上下文中的释义
  partOfSpeech: string;    // 词性缩写
  grammarRole: string;     // 语法角色
  explanation: string;     // 解释为什么是这个意思
  originalSentence?: string; // 原句内容
}

// --- Rapid Lookup (Ultra Fast) ---
export interface RapidLookupResult {
  m: string; // meaning
  p: string; // partOfSpeech
}

// --- Multi-thread AI Assistant ---
export interface Thread {
  id: string;
  title: string;
  messages: Message[];
  context: string | null;
  contextType: 'sentence' | 'word' | 'writing';
  timestamp: number;
}

// --- Translation ---
export interface TranslateResult {
  translation: string;
}
