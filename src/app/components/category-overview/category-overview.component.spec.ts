import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { CategoryOverviewComponent } from './category-overview';
import { StatsService } from '../../services/stats.service';

describe('CategoryOverviewComponent', () => {
  let component: CategoryOverviewComponent;
  let fixture: ComponentFixture<CategoryOverviewComponent>;

  const mockStatsService = {
    statsByType: signal<Record<string, { correct: number; incorrect: number }>>({}).asReadonly(),
    currentGoal: signal(20).asReadonly(),
    currentClockGoal: signal(20).asReadonly(),
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: StatsService, useValue: mockStatsService },
        {
          provide: ActivatedRoute,
          useValue: {
            data: of({ category: 'math' }),
          },
        },
      ],
    });

    fixture = TestBed.createComponent(CategoryOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should compute category title', () => {
    expect(component.categoryTitle()).toBe('📐 Mathe');
  });

  it('should compute category description', () => {
    expect(component.categoryDescription()).toContain('Addition');
  });

  it('should compute base path', () => {
    expect(component.basePath()).toBe('/mathe');
  });

  it('should compute category counts', () => {
    expect(component.categoryCorrectCount()).toBe(0);
    expect(component.categoryIncorrectCount()).toBe(0);
    expect(component.categoryTotalCount()).toBe(0);
  });

  it('should toggle goal editor', () => {
    expect(component.showGoalEditor()).toBeFalse();
    component.editGoal();
    expect(component.showGoalEditor()).toBeTrue();
    component.cancelGoalEdit();
    expect(component.showGoalEditor()).toBeFalse();
  });

  it('should compute goal progress percent', () => {
    expect(component.categoryGoalProgressPercent()).toBe(0);
  });

  it('should compute goal reached', () => {
    expect(component.categoryIsGoalReached()).toBeFalse();
  });
});
