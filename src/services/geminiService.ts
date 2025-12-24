import request from "@/utils/request";
import type { AnalysisResult, DictionaryResult, WritingResult, Message, WritingMode, QuickLookupResult } from "../types";

// --- Public Services ---

export const analyzeSentenceService = (sentence: string): Promise<AnalysisResult> => {
  return request.post('/fastapi/analyze', { sentence }) as Promise<AnalysisResult>;
};

export const lookupWordService = (word: string): Promise<DictionaryResult> => {
  return request.post('/fastapi/lookup', { word }) as Promise<DictionaryResult>;
};

export const evaluateWritingService = (text: string, mode: WritingMode): Promise<WritingResult> => {
  return request.post('/fastapi/writing', { text, mode }) as Promise<WritingResult>;
};

export const getChatResponseService = async (
  history: Message[],
  contextContent: string | null,
  userMessage: string,
  contextType: 'sentence' | 'word' | 'writing' = 'sentence'
): Promise<string> => {
  const result = await request.post('/fastapi/chat', {
    history,
    contextContent,
    userMessage,
    contextType
  }) as { response: string };
  return result.response;
};

export const quickLookupService = (word: string, context: string): Promise<QuickLookupResult> => {
  return request.post('/fastapi/quick-lookup', { word, context }) as Promise<QuickLookupResult>;
};
