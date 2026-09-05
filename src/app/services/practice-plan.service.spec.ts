import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { PracticePlanService } from './practice-plan.service';
import { StatsService } from './stats.service';

describe('PracticePlanService', () => {
  let service: PracticePlanService;
  let router: Router;
  let mockStats: {
    currentGoal: jasmine.Spy;
    currentDeutschGoal: jasmine.Spy;
    currentClockGoal: jasmine.Spy;
  };

  beforeEach(() => {
    mockStats = {
      currentGoal: jasmine.createSpy('currentGoal').and.returnValue(3),
      currentDeutschGoal: jasmine.createSpy('currentDeutschGoal').and.returnValue(2),
      currentClockGoal: jasmine.createSpy('currentClockGoal').and.returnValue(4),
    };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        PracticePlanService,
        { provide: StatsService, useValue: mockStats },
      ],
    });

    service = TestBed.inject(PracticePlanService);
    router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl').and.resolveTo(true);
  });

  it('should start inactive', () => {
    expect(service.isActive()).toBeFalse();
    expect(service.currentBlock()).toBeNull();
    expect(service.typesLocked()).toBeFalse();
  });

  it('should build six blocks from daily goals and fixed sequence targets', () => {
    service.startFromDailyGoals();

    expect(service.isActive()).toBeTrue();
    const blocks = service.blocks();
    expect(blocks.length).toBe(6);
    expect(blocks.map((b) => b.id)).toEqual([
      'math',
      'deutsch',
      'weekdays',
      'months',
      'alphabet',
      'clock',
    ]);
    expect(blocks[0].target).toBe(3);
    expect(blocks[1].target).toBe(2);
    expect(blocks[2].target).toBe(5);
    expect(blocks[3].target).toBe(5);
    expect(blocks[4].target).toBe(5);
    expect(blocks[5].target).toBe(4);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/mathe/uebung');
  });

  it('should lock types on math and clock blocks only', () => {
    service.startFromDailyGoals();
    expect(service.typesLocked()).toBeTrue();

    service.recordCorrect('math');
    service.recordCorrect('math');
    service.recordCorrect('math');
    expect(service.currentBlock()?.id).toBe('deutsch');
    expect(service.typesLocked()).toBeFalse();
  });

  it('should ignore correct answers for a different block', () => {
    service.startFromDailyGoals();
    service.recordCorrect('deutsch');
    expect(service.currentBlock()?.progress).toBe(0);
    expect(service.currentBlock()?.id).toBe('math');
  });

  it('should advance after reaching the block target', () => {
    service.startFromDailyGoals();
    service.recordCorrect('math');
    service.recordCorrect('math');
    expect(service.currentBlock()?.id).toBe('math');
    service.recordCorrect('math');
    expect(service.currentBlock()?.id).toBe('deutsch');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/deutsch/rechtschreibung');
  });

  it('should complete and navigate home after the last block', () => {
    mockStats.currentGoal.and.returnValue(1);
    mockStats.currentDeutschGoal.and.returnValue(1);
    mockStats.currentClockGoal.and.returnValue(1);
    service.startFromDailyGoals();

    const order: (
      | 'math'
      | 'deutsch'
      | 'weekdays'
      | 'months'
      | 'alphabet'
      | 'clock'
    )[] = ['math', 'deutsch', 'weekdays', 'months', 'alphabet', 'clock'];

    for (const id of order) {
      const target = service.currentBlock()!.target;
      for (let i = 0; i < target; i++) {
        service.recordCorrect(id);
      }
    }

    expect(service.isActive()).toBeFalse();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/');
  });

  it('should resume by unpausing and navigating to the current block route', () => {
    service.startFromDailyGoals();
    service.recordCorrect('math');
    service.pause();
    expect(service.isPaused()).toBeTrue();
    expect(service.isGuiding()).toBeFalse();
    expect(service.typesLocked()).toBeFalse();
    (router.navigateByUrl as jasmine.Spy).calls.reset();

    service.resume();

    expect(service.isPaused()).toBeFalse();
    expect(service.isGuiding()).toBeTrue();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/mathe/uebung');
    expect(service.isActive()).toBeTrue();
  });

  it('should ignore correct answers while paused', () => {
    service.startFromDailyGoals();
    service.pause();
    service.recordCorrect('math');
    expect(service.currentBlock()?.progress).toBe(0);
  });

  it('should cancel and clear state', () => {
    service.startFromDailyGoals();
    service.cancel();
    expect(service.isActive()).toBeFalse();
    expect(service.blocks().length).toBe(0);
    expect(service.currentBlock()).toBeNull();
  });

  it('should expose a progress label for the current block', () => {
    service.startFromDailyGoals();
    expect(service.progressLabel()).toBe('Mathe 0/3');
    service.recordCorrect('math');
    expect(service.progressLabel()).toBe('Mathe 1/3');
  });
});
