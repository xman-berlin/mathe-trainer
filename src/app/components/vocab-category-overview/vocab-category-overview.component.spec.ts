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
    deutschCorrectCount: signal(0).asReadonly(),
    deutschIncorrectCount: signal(0).asReadonly(),
    deutschGoalProgressPercent: signal(0).asReadonly(),
    isDeutschGoalReached: signal(false).asReadonly(),
    categoryCorrectSum: jasmine.createSpy('categoryCorrectSum').and.returnValue(0),
    categoryGoalSum: jasmine.createSpy('categoryGoalSum').and.returnValue(25),
    correctFor: jasmine.createSpy('correctFor').and.returnValue(0),
    goalFor: jasmine.createSpy('goalFor').and.returnValue(5),
    isExerciseGoalReached: jasmine.createSpy('isExerciseGoalReached').and.returnValue(false),
    setGoalsForCategory: jasmine.createSpy('setGoalsForCategory'),
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

  it('should save goals for category', () => {
    component.editGoal();
    component.updateDraft('deutsch-rechtschreibung', 15);
    component.saveGoal();
    expect(mockStatsService.setGoalsForCategory).toHaveBeenCalled();
    expect(component.showGoalEditor()).toBeFalse();
  });
});
