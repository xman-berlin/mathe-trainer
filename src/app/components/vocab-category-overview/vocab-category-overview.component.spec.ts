import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DeutschCategoryOverviewComponent } from './vocab-category-overview';
import { StatsService } from '../../services/stats.service';

describe('DeutschCategoryOverviewComponent', () => {
  let component: DeutschCategoryOverviewComponent;
  let fixture: ComponentFixture<DeutschCategoryOverviewComponent>;

  const mockStatsService = {
    statsByType: signal<Record<string, { correct: number; incorrect: number }>>({}).asReadonly(),
    currentDeutschGoal: signal(10).asReadonly(),
    deutschCorrectCount: signal(0).asReadonly(),
    deutschGoalProgressPercent: signal(0).asReadonly(),
    isDeutschGoalReached: signal(false).asReadonly(),
    setDeutschDailyGoal: jasmine.createSpy('setDeutschDailyGoal'),
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: StatsService, useValue: mockStatsService },
      ],
    });

    fixture = TestBed.createComponent(DeutschCategoryOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should compute correct count', () => {
    expect(component.correctCount()).toBe(0);
  });

  it('should compute incorrect count', () => {
    expect(component.incorrectCount()).toBe(0);
  });

  it('should toggle goal editor', () => {
    expect(component.showGoalEditor()).toBeFalse();
    component.editGoal();
    expect(component.showGoalEditor()).toBeTrue();
    component.cancelGoalEdit();
    expect(component.showGoalEditor()).toBeFalse();
  });

  it('should save goal', () => {
    component.editGoalValue.set(15);
    component.saveGoal();
    expect(mockStatsService.setDeutschDailyGoal).toHaveBeenCalledWith(15);
    expect(component.showGoalEditor()).toBeFalse();
  });
});
