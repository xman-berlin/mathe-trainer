import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CoinsService } from './coins.service';
import { SupabaseService } from './supabase.service';
import type { CoinBalance } from '../models/coin.model';

function makeBalance(overrides: Partial<CoinBalance> = {}): CoinBalance {
  return {
    balance: 0,
    total_earned: 0,
    total_spent: 0,
    ...overrides,
  };
}

describe('CoinsService', () => {
  let service: CoinsService;
  let mockSupabase: jasmine.SpyObj<SupabaseService>;

  beforeEach(() => {
    mockSupabase = jasmine.createSpyObj('SupabaseService', [
      'getCoinBalance',
      'upsertCoinBalance',
      'recordCoinTransaction',
    ]);

    // Mock localStorage
    spyOn(localStorage, 'getItem').and.returnValue(null);
    spyOn(localStorage, 'setItem');
    spyOn(localStorage, 'removeItem');

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        CoinsService,
        { provide: SupabaseService, useValue: mockSupabase },
      ],
    });

    service = TestBed.inject(CoinsService);
  });

  // ─── Initial State ──────────────────────────────────────────

  describe('initial state', () => {
    it('should start with balance 0', () => {
      expect(service.balance()).toBe(0);
    });

    it('should start with totalEarned 0', () => {
      expect(service.totalEarned()).toBe(0);
    });

    it('should start with totalSpent 0', () => {
      expect(service.totalSpent()).toBe(0);
    });
  });

  // ─── awardCoins ─────────────────────────────────────────────

  describe('awardCoins', () => {
    it('should increase balance', async () => {
      mockSupabase.upsertCoinBalance.and.resolveTo();
      mockSupabase.recordCoinTransaction.and.resolveTo();
      await service.awardCoins('user-1', 5, 'correct_answer');
      expect(service.balance()).toBe(5);
    });

    it('should increase totalEarned', async () => {
      mockSupabase.upsertCoinBalance.and.resolveTo();
      mockSupabase.recordCoinTransaction.and.resolveTo();
      await service.awardCoins('user-1', 10, 'daily_goal');
      expect(service.totalEarned()).toBe(10);
    });

    it('should not change totalSpent', async () => {
      mockSupabase.upsertCoinBalance.and.resolveTo();
      mockSupabase.recordCoinTransaction.and.resolveTo();
      await service.awardCoins('user-1', 3, 'correct_answer');
      expect(service.totalSpent()).toBe(0);
    });

    it('should ignore zero amount', async () => {
      await service.awardCoins('user-1', 0, 'correct_answer');
      expect(service.balance()).toBe(0);
    });

    it('should ignore negative amount', async () => {
      await service.awardCoins('user-1', -5, 'correct_answer');
      expect(service.balance()).toBe(0);
    });

    it('should accumulate multiple awards', async () => {
      mockSupabase.upsertCoinBalance.and.resolveTo();
      mockSupabase.recordCoinTransaction.and.resolveTo();
      await service.awardCoins('user-1', 3, 'correct_answer');
      await service.awardCoins('user-1', 7, 'daily_goal');
      expect(service.balance()).toBe(10);
      expect(service.totalEarned()).toBe(10);
    });

    it('should persist to localStorage', async () => {
      mockSupabase.upsertCoinBalance.and.resolveTo();
      mockSupabase.recordCoinTransaction.and.resolveTo();
      await service.awardCoins('user-1', 5, 'correct_answer');
      expect(localStorage.setItem).toHaveBeenCalled();
    });
  });

  // ─── spendCoins ─────────────────────────────────────────────

  describe('spendCoins', () => {
    it('should decrease balance', async () => {
      mockSupabase.upsertCoinBalance.and.resolveTo();
      mockSupabase.recordCoinTransaction.and.resolveTo();
      await service.awardCoins('user-1', 10, 'correct_answer');
      const result = await service.spendCoins('user-1', 5, 'game_cost');
      expect(result).toBeTrue();
      expect(service.balance()).toBe(5);
    });

    it('should increase totalSpent', async () => {
      mockSupabase.upsertCoinBalance.and.resolveTo();
      mockSupabase.recordCoinTransaction.and.resolveTo();
      await service.awardCoins('user-1', 10, 'correct_answer');
      await service.spendCoins('user-1', 5, 'game_cost');
      expect(service.totalSpent()).toBe(5);
    });

    it('should return false if cannot afford', async () => {
      const result = await service.spendCoins('user-1', 5, 'game_cost');
      expect(result).toBeFalse();
    });

    it('should not change balance if cannot afford', async () => {
      await service.spendCoins('user-1', 5, 'game_cost');
      expect(service.balance()).toBe(0);
    });

    it('should ignore zero amount', async () => {
      const result = await service.spendCoins('user-1', 0, 'game_cost');
      expect(result).toBeFalse();
    });
  });

  // ─── canAfford ──────────────────────────────────────────────

  describe('canAfford', () => {
    it('should return true when balance is sufficient', async () => {
      mockSupabase.upsertCoinBalance.and.resolveTo();
      mockSupabase.recordCoinTransaction.and.resolveTo();
      await service.awardCoins('user-1', 10, 'correct_answer');
      expect(service.canAfford(5)).toBeTrue();
    });

    it('should return false when balance is insufficient', () => {
      expect(service.canAfford(5)).toBeFalse();
    });

    it('should return true when balance equals amount', async () => {
      mockSupabase.upsertCoinBalance.and.resolveTo();
      mockSupabase.recordCoinTransaction.and.resolveTo();
      await service.awardCoins('user-1', 5, 'correct_answer');
      expect(service.canAfford(5)).toBeTrue();
    });
  });

  // ─── reset ──────────────────────────────────────────────────

  describe('reset', () => {
    it('should reset all state', async () => {
      mockSupabase.upsertCoinBalance.and.resolveTo();
      mockSupabase.recordCoinTransaction.and.resolveTo();
      await service.awardCoins('user-1', 10, 'correct_answer');
      service.reset();
      expect(service.balance()).toBe(0);
      expect(service.totalEarned()).toBe(0);
      expect(service.totalSpent()).toBe(0);
    });
  });

  // ─── loadBalance ────────────────────────────────────────────

  describe('loadBalance', () => {
    it('should load balance from supabase', async () => {
      mockSupabase.getCoinBalance.and.resolveTo(makeBalance({
        balance: 42,
        total_earned: 50,
        total_spent: 8,
      }));
      mockSupabase.recordCoinTransaction.and.resolveTo();
      await service.loadBalance('user-1');
      expect(service.balance()).toBe(42);
    });

    it('should fallback to localStorage on supabase error', async () => {
      mockSupabase.getCoinBalance.and.rejectWith(new Error('network'));
      (localStorage.getItem as jasmine.Spy).and.returnValue(
        JSON.stringify(makeBalance({ balance: 15, total_earned: 20, total_spent: 5 }))
      );
      await service.loadBalance('user-1');
      expect(service.balance()).toBe(15);
    });
  });
});
