/**
 * Vocab / Deutsch / Englisch models
 */

export interface VocabLanguage {
  id: string;
  name: string;
  speech_lang: string;
  created_at?: string;
}

export interface VocabList {
  id: string;
  language_id?: string | null;
  name: string;
  created_at?: string;
}

export interface VocabWord {
  id: string;
  list_id: string;
  /** Deutsch spelling word; optional for English pair rows */
  word?: string | null;
  prompt_en?: string | null;
  answer_de?: string | null;
  context_en?: string | null;
}

export interface VocabAssignment {
  id: string;
  user_id: string;
  list_id: string;
  assigned_at?: string;
  list?: VocabList;
}

export interface VocabWordProgress {
  user_id: string;
  word_id: string;
  weight: number;
}

/**
 * Enriched word used during a practice session
 */
export interface VocabSessionWord {
  wordId: string;
  /** Deutsch: spelling target. Englisch: English prompt for TTS/display. */
  word: string;
  listId: string;
  weight: number;
  promptEn?: string;
  answerDe?: string;
  contextEn?: string | null;
}

export interface EnglischWordPairInput {
  promptEn: string;
  answerDe: string;
  contextEn?: string | null;
}
