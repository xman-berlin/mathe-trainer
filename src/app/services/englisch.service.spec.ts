import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { EnglischService } from './englisch.service';
import { SupabaseService } from './supabase.service';
import type { VocabAssignment, VocabWord, VocabWordProgress } from '../models/vocab.model';

const EN_LANG_ID = 'lang-en';

function makeAssignment(overrides: Partial<VocabAssignment> = {}): VocabAssignment {
  return {
    id: 'assign-1',
    user_id: 'user-1',
    list_id: 'list-1',
    assigned_at: '2025-01-01T00:00:00Z',
    list: { id: 'list-1', name: 'Tiere', language_id: EN_LANG_ID },
    ...overrides,
  };
}

function makePair(overrides: Partial<VocabWord> = {}): VocabWord {
  return {
    id: 'word-1',
    list_id: 'list-1',
    word: 'dog',
    prompt_en: 'dog',
    answer_de: 'Hund',
    context_en: 'The dog runs.',
    ...overrides,
  };
}

describe('EnglischService', () => {
  let service: EnglischService;
  let mockSupabase: jasmine.SpyObj<SupabaseService>;

  beforeEach(() => {
    mockSupabase = jasmine.createSpyObj('SupabaseService', [
      'getVocabLanguageByName',
      'getVocabAssignmentsForUser',
      'getWordProgressForUser',
      'getVocabListWords',
      'upsertWordProgress',
    ]);

    mockSupabase.getVocabLanguageByName.and.resolveTo({
      id: EN_LANG_ID,
      name: 'Englisch',
      speech_lang: 'en-GB',
    });

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        EnglischService,
        { provide: SupabaseService, useValue: mockSupabase },
      ],
    });

    service = TestBed.inject(EnglischService);
  });

  it('should start with empty assignments', () => {
    expect(service.assignments()).toEqual([]);
  });

  it('should load only Englisch assignments', async () => {
    const assignments = [
      makeAssignment(),
      makeAssignment({
        id: 'assign-de',
        list_id: 'list-de',
        list: { id: 'list-de', name: 'Deutsch', language_id: null },
      }),
    ];
    mockSupabase.getVocabAssignmentsForUser.and.resolveTo(assignments);
    mockSupabase.getWordProgressForUser.and.resolveTo([]);

    await service.loadUserData('user-1');
    expect(service.assignments().length).toBe(1);
    expect(service.assignments()[0].list_id).toBe('list-1');
    expect(service.languageId()).toBe(EN_LANG_ID);
    expect(service.speechLang()).toBe('en-GB');
  });

  it('should build session from EN pairs', async () => {
    mockSupabase.getVocabAssignmentsForUser.and.resolveTo([makeAssignment()]);
    mockSupabase.getWordProgressForUser.and.resolveTo([]);
    mockSupabase.getVocabListWords.and.resolveTo([
      makePair(),
      makePair({ id: 'word-2', prompt_en: 'cat', answer_de: 'Katze', word: 'cat' }),
    ]);

    await service.loadUserData('user-1');
    const queue = await service.buildSession('user-1');
    expect(queue.length).toBeGreaterThan(0);
    expect(queue.every((w) => !!w.promptEn && !!w.answerDe)).toBeTrue();
  });

  it('should skip incomplete pairs', async () => {
    mockSupabase.getVocabAssignmentsForUser.and.resolveTo([makeAssignment()]);
    mockSupabase.getWordProgressForUser.and.resolveTo([]);
    mockSupabase.getVocabListWords.and.resolveTo([
      makePair({ id: 'bad', prompt_en: 'dog', answer_de: null }),
    ]);

    await service.loadUserData('user-1');
    const queue = await service.buildSession('user-1');
    expect(queue.length).toBe(0);
  });

  it('should update word weight on correct answer', async () => {
    const progress: VocabWordProgress[] = [
      { user_id: 'user-1', word_id: 'word-1', weight: 3 },
    ];
    mockSupabase.getVocabAssignmentsForUser.and.resolveTo([makeAssignment()]);
    mockSupabase.getWordProgressForUser.and.resolveTo(progress);
    mockSupabase.upsertWordProgress.and.resolveTo();

    await service.loadUserData('user-1');
    await service.updateWordWeight('user-1', 'word-1', true);
    expect(mockSupabase.upsertWordProgress).toHaveBeenCalledWith('user-1', 'word-1', 2);
  });

  it('should clear user data', async () => {
    mockSupabase.getVocabAssignmentsForUser.and.resolveTo([makeAssignment()]);
    mockSupabase.getWordProgressForUser.and.resolveTo([]);
    await service.loadUserData('user-1');
    service.clearUserData();
    expect(service.assignments()).toEqual([]);
  });
});
