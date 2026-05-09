import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { DifficultyService, DEFAULT_LEVELS, MAX_LEVELS } from './difficulty.service';
import { SupabaseService } from './supabase.service';

describe('DifficultyService', () => {
  let service: DifficultyService;
  let mockSupabase: jasmine.SpyObj<SupabaseService>;

  beforeEach(() => {
    mockSupabase = jasmine.createSpyObj('SupabaseService', [
      'getDifficultyLevels',
      'updateDifficultyLevels',
    ]);
    mockSupabase.getDifficultyLevels.and.resolveTo(null);
    mockSupabase.updateDifficultyLevels.and.resolveTo();

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        DifficultyService,
        { provide: SupabaseService, useValue: mockSupabase },
      ],
    });

    service = TestBed.inject(DifficultyService);
  });

  // ─── Defaults ──────────────────────────────────────────────────────────────

  it('should return default level when no state loaded', () => {
    expect(service.getLevel('addition')).toBe(DEFAULT_LEVELS['addition']);
    expect(service.getLevel('subtraction')).toBe(DEFAULT_LEVELS['subtraction']);
    expect(service.getLevel('multiplication')).toBe(DEFAULT_LEVELS['multiplication']);
    expect(service.getLevel('division')).toBe(DEFAULT_LEVELS['division']);
  });

  it('should return correct max levels', () => {
    expect(service.getMaxLevel('addition')).toBe(6);
    expect(service.getMaxLevel('subtraction')).toBe(6);
    expect(service.getMaxLevel('multiplication')).toBe(6);
    expect(service.getMaxLevel('division')).toBe(4);
  });

  it('should return tier name and emoji for default level', () => {
    const tier = service.getTier('addition'); // default level 3 = Wolf
    expect(tier.name).toBe('Wolf');
    expect(tier.emoji).toBe('🐺');
  });

  // ─── Level up ─────────────────────────────────────────────────────────────

  it('should level up after 5 correct answers in a row', () => {
    const startLevel = service.getLevel('addition');
    for (let i = 0; i < 5; i++) {
      service.recordResult('addition', true);
    }
    expect(service.getLevel('addition')).toBe(startLevel + 1);
  });

  it('should reset streak to 0 after levelling up', () => {
    for (let i = 0; i < 5; i++) {
      service.recordResult('addition', true);
    }
    expect(service.getState('addition').streak).toBe(0);
  });

  it('should not exceed max level', () => {
    // Force to max level first
    for (let round = 0; round < MAX_LEVELS['addition']; round++) {
      for (let i = 0; i < 5; i++) service.recordResult('addition', true);
    }
    expect(service.getLevel('addition')).toBe(MAX_LEVELS['addition']);
  });

  it('should not exceed max level for division (4)', () => {
    for (let round = 0; round < MAX_LEVELS['division'] + 2; round++) {
      for (let i = 0; i < 5; i++) service.recordResult('division', true);
    }
    expect(service.getLevel('division')).toBe(MAX_LEVELS['division']);
  });

  // ─── Level down ───────────────────────────────────────────────────────────

  it('should level down when 3 of last 5 answers are wrong', () => {
    // First get to level 2 so we can go down
    for (let i = 0; i < 5; i++) service.recordResult('addition', true);
    const levelBefore = service.getLevel('addition');

    // Now answer 3 wrong out of 5
    service.recordResult('addition', true);
    service.recordResult('addition', false);
    service.recordResult('addition', false);
    service.recordResult('addition', false);
    service.recordResult('addition', true);

    expect(service.getLevel('addition')).toBe(levelBefore - 1);
  });

  it('should not go below level 1', () => {
    // Already at default level 3, drive it down to 1
    for (let round = 0; round < 10; round++) {
      service.recordResult('addition', false);
      service.recordResult('addition', false);
      service.recordResult('addition', false);
      service.recordResult('addition', false);
      service.recordResult('addition', false);
    }
    expect(service.getLevel('addition')).toBe(1);
  });

  it('should reset recent results after levelling down', () => {
    // Get to level 2
    for (let i = 0; i < 5; i++) service.recordResult('addition', true);
    // Trigger level down
    for (let i = 0; i < 3; i++) service.recordResult('addition', false);
    service.recordResult('addition', false);
    service.recordResult('addition', false);

    expect(service.getState('addition').recentResults).toEqual([]);
  });

  // ─── Isolation between types ──────────────────────────────────────────────

  it('should track levels independently per type', () => {
    const addStart = service.getLevel('addition');
    // Level up addition
    for (let i = 0; i < 5; i++) service.recordResult('addition', true);
    // Subtraction should be unchanged
    expect(service.getLevel('subtraction')).toBe(DEFAULT_LEVELS['subtraction']);
    expect(service.getLevel('addition')).toBe(addStart + 1);
  });

  // ─── loadForUser ──────────────────────────────────────────────────────────

  it('should load persisted levels from Supabase', async () => {
    mockSupabase.getDifficultyLevels.and.resolveTo({
      addition: { level: 5, streak: 2, recentResults: [true, true] },
    });
    await service.loadForUser('user-1');
    expect(service.getLevel('addition')).toBe(5);
    // Unset type still returns default
    expect(service.getLevel('subtraction')).toBe(DEFAULT_LEVELS['subtraction']);
  });

  it('should fall back to defaults when Supabase returns null', async () => {
    mockSupabase.getDifficultyLevels.and.resolveTo(null);
    await service.loadForUser('user-1');
    expect(service.getLevel('addition')).toBe(DEFAULT_LEVELS['addition']);
  });

  // ─── clearUser ────────────────────────────────────────────────────────────

  it('should reset to defaults after clearUser', async () => {
    mockSupabase.getDifficultyLevels.and.resolveTo({
      addition: { level: 6, streak: 0, recentResults: [] },
    });
    await service.loadForUser('user-1');
    expect(service.getLevel('addition')).toBe(6);

    service.clearUser();
    expect(service.getLevel('addition')).toBe(DEFAULT_LEVELS['addition']);
  });

  // ─── lastLevelUp / lastLevelDown signals ──────────────────────────────────

  it('should set lastLevelUp when a level-up occurs', () => {
    expect(service.lastLevelUp()).toBeNull();
    for (let i = 0; i < 5; i++) service.recordResult('addition', true);
    const ev = service.lastLevelUp();
    expect(ev).not.toBeNull();
    expect(ev!.type).toBe('addition');
    expect(ev!.level).toBe(DEFAULT_LEVELS['addition'] + 1);
  });

  it('should NOT set lastLevelUp when already at max level', () => {
    // Drive addition to max level
    for (let round = 0; round < MAX_LEVELS['addition']; round++) {
      for (let i = 0; i < 5; i++) service.recordResult('addition', true);
    }
    expect(service.getLevel('addition')).toBe(MAX_LEVELS['addition']);
    // Consume the last event
    service.clearLastLevelUp();

    // Another streak at max — no new event
    for (let i = 0; i < 5; i++) service.recordResult('addition', true);
    expect(service.lastLevelUp()).toBeNull();
  });

  it('should set lastLevelDown when a level-down occurs', () => {
    expect(service.lastLevelDown()).toBeNull();
    // Trigger level down from default level 3
    service.recordResult('addition', false);
    service.recordResult('addition', false);
    service.recordResult('addition', false);
    service.recordResult('addition', false);
    service.recordResult('addition', false);
    const ev = service.lastLevelDown();
    expect(ev).not.toBeNull();
    expect(ev!.type).toBe('addition');
    expect(ev!.level).toBe(DEFAULT_LEVELS['addition'] - 1);
  });

  it('should NOT set lastLevelDown when already at level 1', () => {
    // Drive down to level 1
    for (let round = 0; round < 10; round++) {
      for (let i = 0; i < 5; i++) service.recordResult('addition', false);
    }
    expect(service.getLevel('addition')).toBe(1);
    service.clearLastLevelDown();

    // Another 5 wrong at level 1 — no new event
    for (let i = 0; i < 5; i++) service.recordResult('addition', false);
    expect(service.lastLevelDown()).toBeNull();
  });

  it('should remain null for lastLevelUp when no level change yet', () => {
    // Only 4 correct — not enough to level up
    for (let i = 0; i < 4; i++) service.recordResult('addition', true);
    expect(service.lastLevelUp()).toBeNull();
  });

  it('clearLastLevelUp should reset the signal to null', () => {
    for (let i = 0; i < 5; i++) service.recordResult('addition', true);
    expect(service.lastLevelUp()).not.toBeNull();
    service.clearLastLevelUp();
    expect(service.lastLevelUp()).toBeNull();
  });

  it('clearLastLevelDown should reset the signal to null', () => {
    for (let i = 0; i < 5; i++) service.recordResult('addition', false);
    expect(service.lastLevelDown()).not.toBeNull();
    service.clearLastLevelDown();
    expect(service.lastLevelDown()).toBeNull();
  });

  it('lastLevelUp should stay null after additional correct answers following a cleared event', () => {
    // Level up and consume the event
    for (let i = 0; i < 5; i++) service.recordResult('addition', true);
    service.clearLastLevelUp();

    // More correct answers that do NOT trigger another level-up (streak < 5)
    service.recordResult('addition', true);
    service.recordResult('addition', true);
    expect(service.lastLevelUp()).toBeNull();
  });

  it('lastLevelDown should stay null after additional wrong answers following a cleared event', () => {
    // Level down and consume the event
    for (let i = 0; i < 5; i++) service.recordResult('addition', false);
    service.clearLastLevelDown();

    // recentResults reset — need 5 more wrong to trigger another level-down
    service.recordResult('addition', false);
    service.recordResult('addition', false);
    expect(service.lastLevelDown()).toBeNull();
  });
});
