/**
 * Deutsch category models (Rechtschreibung + future exercise types)
 */

export interface VocabList {
  id: string;
  language_id?: string; // optional — not used in Deutsch category
  name: string; // defaults to first word if not set
  created_at?: string;
}

export interface VocabWord {
  id: string;
  list_id: string;
  word: string;
}

export interface VocabAssignment {
  id: string;
  user_id: string;
  list_id: string;
  assigned_at?: string;
  // Joined data
  list?: VocabList;
}

export interface VocabWordProgress {
  user_id: string;
  word_id: string;
  weight: number; // default 3; min 1 on correct, +2 on wrong
}

/**
 * Enriched word used during a practice session
 */
export interface VocabSessionWord {
  wordId: string;
  word: string;
  listId: string;
  weight: number;
}
