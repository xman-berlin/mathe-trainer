import { Injectable, signal, computed, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import type { CoinBalance, CoinTransaction, CoinTransactionReason } from '../models/coin.model';

/**
 * Service for managing user coins
 * Handles balance, transactions, and sync with Supabase
 */
@Injectable({
  providedIn: 'root',
})
export class CoinsService {
  private supabase = inject(SupabaseService);

  // Signals
  private balanceSignal = signal<CoinBalance>({
    balance: 0,
    total_earned: 0,
    total_spent: 0,
  });

  private currentUserId = signal<string | null>(null);
  private transactionQueue = signal<CoinTransaction[]>([]);

  // Public computed
  public balance = computed(() => this.balanceSignal().balance);
  public totalEarned = computed(() => this.balanceSignal().total_earned);
  public totalSpent = computed(() => this.balanceSignal().total_spent);

  // localStorage keys
  private readonly STORAGE_KEY = 'schlaufuchs-coins';
  private readonly QUEUE_KEY = 'schlaufuchs-coins-queue';

  /**
   * Load balance for a user
   */
  async loadBalance(userId: string): Promise<void> {
    this.currentUserId.set(userId);

    try {
      // Try to load from Supabase first
      const supabaseBalance = await this.supabase.getCoinBalance(userId);

      // Load from localStorage as fallback
      const localBalance = this.loadFromLocalStorage(userId);

      // Use whichever has higher balance (offline changes)
      const balance = supabaseBalance.balance >= localBalance.balance
        ? supabaseBalance
        : localBalance;

      this.balanceSignal.set(balance);

      // Process any queued transactions
      await this.processTransactionQueue(userId);
    } catch (error) {
      console.error('Error loading coin balance:', error);
      // Fallback to localStorage
      const localBalance = this.loadFromLocalStorage(userId);
      this.balanceSignal.set(localBalance);
    }
  }

  /**
   * Award coins to user
   */
  async awardCoins(
    userId: string,
    amount: number,
    reason: CoinTransactionReason,
    relatedId?: string
  ): Promise<void> {
    if (amount <= 0) return;

    const currentBalance = this.balanceSignal();
    const newBalance: CoinBalance = {
      balance: currentBalance.balance + amount,
      total_earned: currentBalance.total_earned + amount,
      total_spent: currentBalance.total_spent,
    };

    // Optimistic update
    this.balanceSignal.set(newBalance);
    this.saveToLocalStorage(userId, newBalance);

    // Create transaction
    const transaction: CoinTransaction = {
      user_id: userId,
      amount,
      reason,
      related_id: relatedId,
    };

    try {
      // Try to sync to Supabase
      await this.supabase.upsertCoinBalance(userId, newBalance);
      await this.supabase.recordCoinTransaction(transaction);
    } catch (error) {
      console.error('Error awarding coins, queuing transaction:', error);
      this.queueTransaction(transaction);
    }
  }

  /**
   * Spend coins (e.g., for games)
   */
  async spendCoins(
    userId: string,
    amount: number,
    reason: CoinTransactionReason,
    relatedId?: string
  ): Promise<boolean> {
    if (amount <= 0) return false;

    const currentBalance = this.balanceSignal();

    // Check if user can afford
    if (currentBalance.balance < amount) {
      return false;
    }

    const newBalance: CoinBalance = {
      balance: currentBalance.balance - amount,
      total_earned: currentBalance.total_earned,
      total_spent: currentBalance.total_spent + amount,
    };

    // Optimistic update
    this.balanceSignal.set(newBalance);
    this.saveToLocalStorage(userId, newBalance);

    // Create transaction (negative amount)
    const transaction: CoinTransaction = {
      user_id: userId,
      amount: -amount,
      reason,
      related_id: relatedId,
    };

    try {
      // Try to sync to Supabase
      await this.supabase.upsertCoinBalance(userId, newBalance);
      await this.supabase.recordCoinTransaction(transaction);
      return true;
    } catch (error) {
      console.error('Error spending coins, queuing transaction:', error);
      this.queueTransaction(transaction);
      return true;
    }
  }

  /**
   * Check if user can afford an amount
   */
  canAfford(amount: number): boolean {
    return this.balance() >= amount;
  }

  /**
   * Reset balance (for user switching)
   */
  reset(): void {
    this.balanceSignal.set({
      balance: 0,
      total_earned: 0,
      total_spent: 0,
    });
    this.currentUserId.set(null);
  }

  // ============================================================================
  // PRIVATE METHODS - localStorage
  // ============================================================================

  private loadFromLocalStorage(userId: string): CoinBalance {
    try {
      const key = `${this.STORAGE_KEY}-${userId}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading coins from localStorage:', error);
    }

    return {
      balance: 0,
      total_earned: 0,
      total_spent: 0,
    };
  }

  private saveToLocalStorage(userId: string, balance: CoinBalance): void {
    try {
      const key = `${this.STORAGE_KEY}-${userId}`;
      localStorage.setItem(key, JSON.stringify(balance));
    } catch (error) {
      console.error('Error saving coins to localStorage:', error);
    }
  }

  // ============================================================================
  // PRIVATE METHODS - Transaction Queue (Offline Support)
  // ============================================================================

  private queueTransaction(transaction: CoinTransaction): void {
    const queue = this.transactionQueue();
    this.transactionQueue.set([...queue, transaction]);
    this.saveQueueToLocalStorage();
  }

  private async processTransactionQueue(_userId: string): Promise<void> {
    this.loadQueueFromLocalStorage();
    const queue = this.transactionQueue();

    if (queue.length === 0) return;


    for (const transaction of queue) {
      try {
        await this.supabase.recordCoinTransaction(transaction);
      } catch (error) {
        console.error('Error processing queued transaction:', error);
        // Keep it in queue for next time
        return;
      }
    }

    // Clear queue after successful sync
    this.transactionQueue.set([]);
    this.saveQueueToLocalStorage();
  }

  private loadQueueFromLocalStorage(): void {
    try {
      const stored = localStorage.getItem(this.QUEUE_KEY);
      if (stored) {
        const queue = JSON.parse(stored);
        this.transactionQueue.set(queue);
      }
    } catch (error) {
      console.error('Error loading transaction queue:', error);
    }
  }

  private saveQueueToLocalStorage(): void {
    try {
      localStorage.setItem(this.QUEUE_KEY, JSON.stringify(this.transactionQueue()));
    } catch (error) {
      console.error('Error saving transaction queue:', error);
    }
  }
}
