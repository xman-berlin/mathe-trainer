import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SequenceExerciseComponent } from './sequence-exercise';
import { SequenceService } from '../../services/sequence.service';
import { StatsService } from '../../services/stats.service';
import type { Question } from '../../services/sequence.service';

describe('SequenceExerciseComponent', () => {
  let component: SequenceExerciseComponent;
  let fixture: ComponentFixture<SequenceExerciseComponent>;
  let mockSequenceService: jasmine.SpyObj<SequenceService>;
  let mockStatsService: { recordResult: jasmine.Spy; statsByType: () => Record<string, unknown> };

  function createComponent(type?: 'weekdays' | 'months'): void {
    fixture = TestBed.createComponent(SequenceExerciseComponent);
    component = fixture.componentInstance;

    // Set route data via private property (same pattern as vocab-exercise spec)
    if (type) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (component as any).route.snapshot.data['type'] = type;
    }

    fixture.detectChanges();
  }

  beforeEach(() => {
    mockStatsService = {
      recordResult: jasmine.createSpy('recordResult'),
      statsByType: signal({}).asReadonly(),
    };
    mockSequenceService = jasmine.createSpyObj('SequenceService', ['generateQuestion']);
    mockSequenceService.generateQuestion.and.returnValue({
      questionType: 1,
      question: 'Welcher Wochentag kommt nach Montag?',
      options: ['Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'],
      correctIndex: 0,
    });

    TestBed.configureTestingModule({
      imports: [SequenceExerciseComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: SequenceService, useValue: mockSequenceService },
        { provide: StatsService, useValue: mockStatsService },
      ],
    });
  });

  it('should create', () => {
    createComponent();
    expect(component).toBeTruthy();
  });

  it('should default to weekdays when no route data', () => {
    createComponent();
    expect(component.exerciseType()).toBe('weekdays');
  });

  it('should set exercise type from route data', () => {
    createComponent('months');
    expect(component.exerciseType()).toBe('months');
  });

  it('should generate first question on init', () => {
    createComponent('weekdays');
    expect(mockSequenceService.generateQuestion).toHaveBeenCalledWith('weekdays');
    expect(component.isLoading()).toBeFalse();
    expect(component.question()).toBeTruthy();
  });

  it('should display 4 options', () => {
    createComponent('weekdays');
    expect(component.options().length).toBe(4);
  });

  it('should mark correct answer', () => {
    createComponent('weekdays');
    component.selectAnswer(0);

    expect(component.feedback()).toBe('correct');
    expect(mockStatsService.recordResult).toHaveBeenCalledWith(true, 'deutsch-wochentage');
  });

  it('should mark incorrect answer', () => {
    mockSequenceService.generateQuestion.and.returnValue({
      questionType: 1,
      question: 'Welcher Wochentag kommt nach Montag?',
      options: ['Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'],
      correctIndex: 0,
    });
    createComponent('weekdays');
    component.selectAnswer(1);

    expect(component.feedback()).toBe('incorrect');
    expect(mockStatsService.recordResult).toHaveBeenCalledWith(false, 'deutsch-wochentage');
  });

  it('should ignore selection when disabled', () => {
    createComponent('weekdays');
    component.disabled.set(true);
    component.selectAnswer(0);

    expect(mockStatsService.recordResult).not.toHaveBeenCalled();
  });

  it('should advance to next question after correct answer', () => {
    const questions: Question[] = [
      { questionType: 1, question: 'Q1', options: ['A', 'B', 'C', 'D'], correctIndex: 0 },
      { questionType: 2, question: 'Q2', options: ['E', 'F', 'G', 'H'], correctIndex: 1 },
    ];
    mockSequenceService.generateQuestion.and.returnValues(questions[0], questions[1]);

    createComponent('weekdays');
    expect(component.question()).toBe('Q1');

    component.selectAnswer(0);
    (component as unknown as { advance: () => void }).advance();

    expect(component.question()).toBe('Q2');
  });

  it('should use correct stats type for months', () => {
    createComponent('months');
    component.selectAnswer(0);

    expect(mockStatsService.recordResult).toHaveBeenCalledWith(true, 'deutsch-monate');
  });

  it('should disable buttons after selection', () => {
    createComponent('weekdays');
    component.selectAnswer(0);

    expect(component.disabled()).toBeTrue();
  });

  it('should reset state on advance', () => {
    createComponent('weekdays');
    component.selectAnswer(0);
    (component as unknown as { advance: () => void }).advance();

    expect(component.feedback()).toBeNull();
    expect(component.selectedOption()).toBeNull();
    expect(component.disabled()).toBeFalse();
  });

  it('should show correct answer in feedback when wrong', () => {
    createComponent('weekdays');
    component.selectAnswer(1);

    expect(component.feedback()).toBe('incorrect');
    // The correct answer text should be accessible
    expect(component.options()[component.correctIndex()]).toBe('Dienstag');
  });
});
