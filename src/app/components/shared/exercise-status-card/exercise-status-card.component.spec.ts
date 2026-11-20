import { provideZonelessChangeDetection, signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ExerciseStatusCardComponent,
  ExerciseDifficultyView,
} from './exercise-status-card.component';

describe('ExerciseStatusCardComponent', () => {
  let fixture: ComponentFixture<ExerciseStatusCardComponent>;
  let component: ExerciseStatusCardComponent;
  let difficultySig: WritableSignal<ExerciseDifficultyView | null>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
    fixture = TestBed.createComponent(ExerciseStatusCardComponent);
    component = fixture.componentInstance;
    difficultySig = signal(null);
    component.streak = signal(3);
    component.bestStreak = signal(5);
    component.correctCount = signal(4);
    component.incorrectCount = signal(1);
    component.difficulty = difficultySig;
    fixture.detectChanges();
  });

  it('should show streak and daily stats without difficulty', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.difficulty-block')).toBeNull();
    expect(el.textContent).toContain('Serie:');
    expect(el.textContent).toContain('3');
    expect(el.textContent).toContain('Beste:');
    expect(el.textContent).toContain('Heute');
    expect(el.textContent).toContain('✓ 4');
  });

  it('should show difficulty when provided', () => {
    const diff: ExerciseDifficultyView = {
      emoji: '🦊',
      name: 'Fuchs',
      level: 2,
      maxLevel: 5,
      streak: 2,
      streakUpNeeded: 5,
      nextEmoji: '🐺',
      nextName: 'Wolf',
      flash: null,
    };
    difficultySig.set(diff);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.difficulty-block')).toBeTruthy();
    expect(el.textContent).toContain('Fuchs');
    expect(el.textContent).toContain('Stufe 2/5');
    expect(el.querySelectorAll('.progress-dot.filled').length).toBe(2);
  });
});
