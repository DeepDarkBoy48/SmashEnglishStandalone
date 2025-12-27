import request from "@/utils/request";
import type { 
  AnalysisResult, 
  DictionaryResult, 
  WritingResult, 
  Message, 
  WritingMode, 
  QuickLookupResult, 
  TranslateResult, 
  RapidLookupResult, 
  SavedWordsResponse, 
  DailyNotesResponse, 
  NoteDetailResponse,
  VideoNotebook,
  VideoNotebookListResponse
} from "../types";

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

export const quickLookupService = (word: string, context: string, url?: string): Promise<QuickLookupResult> => {
  return request.post('/fastapi/quick-lookup', { word, context, url }) as Promise<QuickLookupResult>;
};

export const translateService = (text: string): Promise<TranslateResult> => {
  return request.post('/fastapi/translate', { text }) as Promise<TranslateResult>;
};
export const rapidLookupService = (word: string, context: string): Promise<RapidLookupResult> => {
  return request.post('/fastapi/rapid-lookup', { word, context }) as Promise<RapidLookupResult>;
};

export const getSavedWordsService = (): Promise<SavedWordsResponse> => {
  return request.get('/fastapi/saved-words') as Promise<SavedWordsResponse>;
};

export const getDailyNotesService = (): Promise<DailyNotesResponse> => {
  return request.get('/fastapi/daily-notes') as Promise<DailyNotesResponse>;
};

export const getNoteDetailService = (noteId: number): Promise<NoteDetailResponse> => {
  return request.get(`/fastapi/daily-notes/${noteId}`) as Promise<NoteDetailResponse>;
};

export const summarizeDailyNoteService = (noteId: number): Promise<{ title: string, summary: string, content: string }> => {
  return request.post(`/fastapi/daily-notes/${noteId}/summarize`) as Promise<{ title: string, summary: string, content: string }>;
};

export const deleteSavedWordService = (wordId: number): Promise<any> => {
  return request.delete(`/fastapi/saved-words/${wordId}`);
};

// --- Video Notebook Services ---

export const listNotebooksService = (): Promise<VideoNotebookListResponse> => {
  return request.get('/fastapi/notebooks') as Promise<VideoNotebookListResponse>;
};

export const getNotebookDetailService = (notebookId: number): Promise<VideoNotebook> => {
  return request.get(`/fastapi/notebooks/${notebookId}`) as Promise<VideoNotebook>;
};

export const createNotebookService = (data: {
  title: string;
  video_url: string;
  video_id: string | null;
  srt_content: string;
  thumbnail_url: string | null;
}): Promise<VideoNotebook> => {
  return request.post('/fastapi/notebooks', data) as Promise<VideoNotebook>;
};

export const updateNotebookService = (notebookId: number, data: Partial<{
  title: string;
  video_url: string;
  video_id: string | null;
  srt_content: string;
  thumbnail_url: string | null;
}>): Promise<VideoNotebook> => {
  return request.put(`/fastapi/notebooks/${notebookId}`, data) as Promise<VideoNotebook>;
};

export const deleteNotebookService = (notebookId: number): Promise<any> => {
  return request.delete(`/fastapi/notebooks/${notebookId}`);
};
