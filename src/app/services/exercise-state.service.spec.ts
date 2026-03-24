import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ExerciseStateService } from './exercise-state.service';

describe('ExerciseStateService', () => {
  let service: ExerciseStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), ExerciseStateService],
    });
    service = TestBed.inject(ExerciseStateService);
  });

  // ─── Initial State ─────────────────────────────────────────

  describe('initial state', () => {
    it('should start with streak 0', () => {
      expect(service.streak()).toBe(0);
    });

    it('should start with bestStreak 0', () => {
      expect(service.bestStreak()).toBe(0);
    });

    it('should start with showMilestone false', () => {
      expect(service.showMilestone()).toBeFalse();
    });

    it('should start with milestoneValue 0', () => {
      expect(service.milestoneValue()).toBe(0);
    });

    it('should have 20 confetti pieces', () => {
      expect(service.confettiPieces.length).toBe(20);
    });

    it('should have 20 confetti X positions', () => {
      expect(service.confettiX.length).toBe(20);
    });
  });

  // ─── handleResult (correct) ────────────────────────────────

  describe('handleResult — correct answer', () => {
    it('should increment streak on correct answer (synchronous via setTimeout 0)', async () => {
      service.handleResult(true, () => {}, 0);
      await new Promise(r => setTimeout(r, 10));
      expect(service.streak()).toBe(1);
    });

    it('should increment streak multiple times', async () => {
      service.handleResult(true, () => {}, 0);
      await new Promise(r => setTimeout(r, 10));
      service.handleResult(true, () => {}, 0);
      await new Promise(r => setTimeout(r, 10));
      service.handleResult(true, () => {}, 0);
      await new Promise(r => setTimeout(r, 10));
      expect(service.streak()).toBe(3);
    });

    it('should update bestStreak when streak exceeds it', async () => {
      service.handleResult(true, () => {}, 0);
      await new Promise(r => setTimeout(r, 10));
      service.handleResult(true, () => {}, 0);
      await new Promise(r => setTimeout(r, 10));
      expect(service.bestStreak()).toBe(2);
    });

    it('should not lower bestStreak after incorrect resets streak', async () => {
      service.handleResult(true, () => {}, 0);
      await new Promise(r => setTimeout(r, 10));
      service.handleResult(true, () => {}, 0);
      await new Promise(r => setTimeout(r, 10));
      service.handleResult(false, () => {}, 0, 0);
      await new Promise(r => setTimeout(r, 10));
      expect(service.bestStreak()).toBe(2);
      expect(service.streak()).toBe(0);
    });

    it('should call onAdvance after correctDelay', async () => {
      let advanced = false;
      service.handleResult(true, () => { advanced = true; }, 0);
      expect(advanced).toBeFalse();
      await new Promise(r => setTimeout(r, 10));
      expect(advanced).toBeTrue();
    });
  });

  // ─── handleResult (incorrect) ──────────────────────────────

  describe('handleResult — incorrect answer', () => {
    it('should reset streak to 0 on incorrect answer', async () => {
      service.handleResult(true, () => {}, 0);
      await new Promise(r => setTimeout(r, 10));
      service.handleResult(true, () => {}, 0);
      await new Promise(r => setTimeout(r, 10));
      service.handleResult(false, () => {}, 0, 0);
      await new Promise(r => setTimeout(r, 10));
      expect(service.streak()).toBe(0);
    });

    it('should call onAdvance after incorrectDelay', async () => {
      let advanced = false;
      service.handleResult(false, () => { advanced = true; }, 0, 0);
      expect(advanced).toBeFalse();
      await new Promise(r => setTimeout(r, 10));
      expect(advanced).toBeTrue();
    });
  });

  // ─── Milestones ────────────────────────────────────────────

  describe('milestones', () => {
    it('should show milestone popup when streak hits default milestone (5)', async () => {
      for (let i = 0; i < 4; i++) {
        service.handleResult(true, () => {}, 0);
        await new Promise(r => setTimeout(r, 10));
      }
      expect(service.showMilestone()).toBeFalse();

      service.handleResult(true, () => {}, 0);
      await new Promise(r => setTimeout(r, 10));
      expect(service.showMilestone()).toBeTrue();
      expect(service.milestoneValue()).toBe(5);
    });

    it('should auto-hide milestone popup after 2000ms', async () => {
      for (let i = 0; i < 5; i++) {
        service.handleResult(true, () => {}, 0);
        await new Promise(r => setTimeout(r, 10));
      }
      expect(service.showMilestone()).toBeTrue();
      await new Promise(r => setTimeout(r, 2100));
      expect(service.showMilestone()).toBeFalse();
    });

    it('should use custom milestones', async () => {
      service.setMilestones([3, 7]);
      service.handleResult(true, () => {}, 0);
      await new Promise(r => setTimeout(r, 10));
      service.handleResult(true, () => {}, 0);
      await new Promise(r => setTimeout(r, 10));
      expect(service.showMilestone()).toBeFalse();

      service.handleResult(true, () => {}, 0);
      await new Promise(r => setTimeout(r, 10));
      expect(service.showMilestone()).toBeTrue();
      expect(service.milestoneValue()).toBe(3);
    });

    it('should not show milestone on non-milestone streak', async () => {
      service.handleResult(true, () => {}, 0);
      await new Promise(r => setTimeout(r, 10));
      service.handleResult(true, () => {}, 0);
      await new Promise(r => setTimeout(r, 10));
      expect(service.showMilestone()).toBeFalse();
    });
  });

  // ─── reset ─────────────────────────────────────────────────

  describe('reset', () => {
    it('should reset all state', async () => {
      for (let i = 0; i < 5; i++) {
        service.handleResult(true, () => {}, 0);
        await new Promise(r => setTimeout(r, 10));
      }
      expect(service.streak()).toBe(5);
      expect(service.bestStreak()).toBe(5);

      service.reset();
      expect(service.streak()).toBe(0);
      expect(service.bestStreak()).toBe(0);
      expect(service.showMilestone()).toBeFalse();
      expect(service.milestoneValue()).toBe(0);
    });
  });
});
