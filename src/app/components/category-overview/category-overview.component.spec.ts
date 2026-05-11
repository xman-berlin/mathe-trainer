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
    currentMathNumberRange: signal(100).asReadonly(),
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

  // ─── Zahlenraum (range editor) ──────────────────────────────

  describe('range editor', () => {
    it('showRangeEditor should default to false', () => {
      expect(component.showRangeEditor()).toBeFalse();
    });

    it('editRangeInput should default to 100', () => {
      expect(component.editRangeInput()).toBe(100);
    });

    it('editRangeError should default to false', () => {
      expect(component.editRangeError()).toBeFalse();
    });

    it('editRangeValid should be true for 100', () => {
      component.editRangeInput.set(100);
      expect(component.editRangeValid()).toBeTrue();
    });

    it('editRangeValid should be true for values above 100', () => {
      component.editRangeInput.set(500);
      expect(component.editRangeValid()).toBeTrue();
    });

    it('editRangeValid should be false for 99', () => {
      component.editRangeInput.set(99);
      expect(component.editRangeValid()).toBeFalse();
    });

    it('editRangeValid should be false for 0', () => {
      component.editRangeInput.set(0);
      expect(component.editRangeValid()).toBeFalse();
    });

    it('mathNumberRange should reflect stats.currentMathNumberRange', () => {
      expect(component.mathNumberRange()).toBe(100);
    });

    it('openRangeEditor should open the editor and pre-populate input', () => {
      component.openRangeEditor();
      expect(component.showRangeEditor()).toBeTrue();
      expect(component.editRangeInput()).toBe(100);
      expect(component.editRangeError()).toBeFalse();
    });

    it('cancelRangeEdit should close the editor', () => {
      component.openRangeEditor();
      component.cancelRangeEdit();
      expect(component.showRangeEditor()).toBeFalse();
    });

    it('saveRange: valid input calls setMathNumberRange and closes editor', () => {
      const setRangeSpy = jasmine.createSpy('setMathNumberRange');
      (mockStatsService as Record<string, unknown>)['setMathNumberRange'] = setRangeSpy;

      component.editRangeInput.set(250);
      component.saveRange();

      expect(setRangeSpy).toHaveBeenCalledWith(250);
      expect(component.showRangeEditor()).toBeFalse();
    });

    it('saveRange: invalid input sets editRangeError and keeps editor open', () => {
      (mockStatsService as Record<string, unknown>)['setMathNumberRange'] = jasmine.createSpy();

      component.openRangeEditor();
      component.editRangeInput.set(50); // below 100 — invalid
      component.saveRange();

      expect(component.editRangeError()).toBeTrue();
      expect(component.showRangeEditor()).toBeTrue();
    });
  });
});
