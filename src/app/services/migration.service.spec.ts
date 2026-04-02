import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MigrationService } from './migration.service';
import { SupabaseService } from './supabase.service';

describe('MigrationService', () => {
  let service: MigrationService;
  let mockSupabase: jasmine.SpyObj<SupabaseService>;

  beforeEach(() => {
    mockSupabase = jasmine.createSpyObj('SupabaseService', [
      'upsertDailyStats',
      'upsertLifetimeStats',
      'upsertPersonalBest',
    ]);

    spyOn(localStorage, 'getItem').and.returnValue(null);
    spyOn(localStorage, 'setItem');
    spyOn(localStorage, 'removeItem');

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        MigrationService,
        { provide: SupabaseService, useValue: mockSupabase },
      ],
    });

    service = TestBed.inject(MigrationService);
  });

  // ─── hasMigratedData ────────────────────────────────────────

  describe('hasMigratedData', () => {
    it('should return false when not migrated', () => {
      expect(service.hasMigratedData()).toBeFalse();
    });

    it('should return true when migrated', () => {
      (localStorage.getItem as jasmine.Spy).and.callFake((key: string) =>
        key === 'schlaufuchs-migrated' ? 'true' : null
      );
      expect(service.hasMigratedData()).toBeTrue();
    });
  });

  // ─── hasOldDataAvailable ────────────────────────────────────

  describe('hasOldDataAvailable', () => {
    it('should return false when no old data', () => {
      expect(service.hasOldDataAvailable()).toBeFalse();
    });

    it('should return true when stats data exists', () => {
      (localStorage.getItem as jasmine.Spy).and.callFake((key: string) =>
        key === 'schlaufuchs-stats' ? '{}' : null
      );
      expect(service.hasOldDataAvailable()).toBeTrue();
    });

    it('should return true when lifetime data exists', () => {
      (localStorage.getItem as jasmine.Spy).and.callFake((key: string) =>
        key === 'schlaufuchs-lifetime-stats' ? '{}' : null
      );
      expect(service.hasOldDataAvailable()).toBeTrue();
    });

    it('should return true when time trials data exists', () => {
      (localStorage.getItem as jasmine.Spy).and.callFake((key: string) =>
        key === 'schlaufuchs-time-trials' ? '{}' : null
      );
      expect(service.hasOldDataAvailable()).toBeTrue();
    });
  });

  // ─── migrateLocalDataToUser ─────────────────────────────────

  describe('migrateLocalDataToUser', () => {
    it('should call upsertDailyStats when daily stats exist', async () => {
      (localStorage.getItem as jasmine.Spy).and.callFake((key: string) => {
        if (key === 'schlaufuchs-stats') {
          return JSON.stringify({ date: '2025-01-01', correct: 5, incorrect: 2 });
        }
        return null;
      });
      mockSupabase.upsertDailyStats.and.resolveTo();
      mockSupabase.upsertLifetimeStats.and.resolveTo();

      await service.migrateLocalDataToUser('user-1');
      expect(mockSupabase.upsertDailyStats).toHaveBeenCalled();
    });

    it('should call upsertLifetimeStats when lifetime stats exist', async () => {
      (localStorage.getItem as jasmine.Spy).and.callFake((key: string) => {
        if (key === 'schlaufuchs-lifetime-stats') {
          return JSON.stringify({ byType: { addition: 10 } });
        }
        return null;
      });
      mockSupabase.upsertDailyStats.and.resolveTo();
      mockSupabase.upsertLifetimeStats.and.resolveTo();

      await service.migrateLocalDataToUser('user-1');
      expect(mockSupabase.upsertLifetimeStats).toHaveBeenCalled();
    });

    it('should call upsertPersonalBest for each time trial', async () => {
      (localStorage.getItem as jasmine.Spy).and.callFake((key: string) => {
        if (key === 'schlaufuchs-time-trials') {
          return JSON.stringify([
            { exerciseTypes: ['addition'], correctCount: 5, totalCount: 5, accuracy: 100 },
            { exerciseTypes: ['subtraction'], correctCount: 3, totalCount: 5, accuracy: 60 },
          ]);
        }
        return null;
      });
      mockSupabase.upsertDailyStats.and.resolveTo();
      mockSupabase.upsertLifetimeStats.and.resolveTo();
      mockSupabase.upsertPersonalBest.and.resolveTo();

      await service.migrateLocalDataToUser('user-1');
      expect(mockSupabase.upsertPersonalBest).toHaveBeenCalledTimes(2);
    });

    it('should mark migration as complete', async () => {
      mockSupabase.upsertDailyStats.and.resolveTo();
      mockSupabase.upsertLifetimeStats.and.resolveTo();

      await service.migrateLocalDataToUser('user-1');
      expect(localStorage.setItem).toHaveBeenCalledWith('schlaufuchs-migrated', 'true');
    });

    it('should throw on supabase error', async () => {
      (localStorage.getItem as jasmine.Spy).and.callFake((key: string) => {
        if (key === 'schlaufuchs-stats') {
          return JSON.stringify({ date: '2025-01-01', correct: 5 });
        }
        return null;
      });
      mockSupabase.upsertDailyStats.and.rejectWith(new Error('network'));

      await expectAsync(service.migrateLocalDataToUser('user-1')).toBeRejected();
    });

    it('should not throw when no old data exists', async () => {
      await expectAsync(service.migrateLocalDataToUser('user-1')).not.toBeRejected();
    });
  });

  // ─── skipMigration ──────────────────────────────────────────

  describe('skipMigration', () => {
    it('should mark migration as complete', () => {
      service.skipMigration();
      expect(localStorage.setItem).toHaveBeenCalledWith('schlaufuchs-migrated', 'true');
    });
  });

  // ─── clearOldData ───────────────────────────────────────────

  describe('clearOldData', () => {
    it('should remove all old localStorage keys', () => {
      service.clearOldData();
      expect(localStorage.removeItem).toHaveBeenCalledWith('schlaufuchs-stats');
      expect(localStorage.removeItem).toHaveBeenCalledWith('schlaufuchs-lifetime-stats');
      expect(localStorage.removeItem).toHaveBeenCalledWith('schlaufuchs-time-trials');
    });
  });
});
