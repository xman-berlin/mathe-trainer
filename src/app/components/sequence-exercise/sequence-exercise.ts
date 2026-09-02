import { Component, OnInit, OnDestroy, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { StatsService } from '../../services/stats.service';
import { ExerciseStateService } from '../../services/exercise-state.service';
import { SequenceService } from '../../services/sequence.service';

@Component({
  selector: 'app-sequence-exercise',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './sequence-exercise.html',
  styleUrls: ['./sequence-exercise.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ExerciseStateService],
})
export class SequenceExerciseComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private sequenceService = inject(SequenceService);
  protected statsService = inject(StatsService);
  protected exerciseState = inject(ExerciseStateService);

  readonly exerciseType = signal<'weekdays' | 'months' | 'alphabet'>('weekdays');
  readonly question = signal('');
  readonly options = signal<string[]>([]);
  readonly correctIndex = signal(-1);
  readonly selectedOption = signal<number | null>(null);
  readonly feedback = signal<'correct' | 'incorrect' | null>(null);
  readonly isLoading = signal(true);
  readonly disabled = signal(false);

  readonly streak = this.exerciseState.streak;
  readonly bestStreak = this.exerciseState.bestStreak;
  readonly showMilestone = this.exerciseState.showMilestone;
  readonly milestoneValue = this.exerciseState.milestoneValue;
  readonly confettiPieces = this.exerciseState.confettiPieces;
  readonly confettiX = this.exerciseState.confettiX;

  readonly typeCorrectCount = signal(0);
  readonly typeIncorrectCount = signal(0);
  readonly typeTotalCount = signal(0);
  private statsInterval: ReturnType<typeof setInterval> | undefined;

  ngOnInit(): void {
    const type = this.route.snapshot.data['type'] as 'weekdays' | 'months' | 'alphabet' | undefined;
    this.exerciseType.set(type ?? 'weekdays');

    this.refreshStats();
    this.statsInterval = setInterval(() => this.refreshStats(), 1000);
    this.nextQuestion();
  }

  ngOnDestroy(): void {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
    }
    this.exerciseState.reset();
  }

  private refreshStats(): void {
    const stats = this.statsService.statsByType()[this.typeString()];
    const correct = stats?.correct ?? 0;
    const incorrect = stats?.incorrect ?? 0;
    this.typeCorrectCount.set(correct);
    this.typeIncorrectCount.set(incorrect);
    this.typeTotalCount.set(correct + incorrect);
  }

  private typeString(): string {
    switch (this.exerciseType()) {
      case 'weekdays': return 'deutsch-wochentage';
      case 'months': return 'deutsch-monate';
      case 'alphabet': return 'deutsch-alphabet';
    }
  }

  private nextQuestion(): void {
    const q = this.sequenceService.generateQuestion(this.exerciseType());
    if (!q) {
      return;
    }
    this.question.set(q.question);
    this.options.set(q.options);
    this.correctIndex.set(q.correctIndex);
    this.selectedOption.set(null);
    this.feedback.set(null);
    this.disabled.set(false);
    this.isLoading.set(false);
  }

  selectAnswer(index: number): void {
    if (this.disabled()) return;

    this.selectedOption.set(index);
    this.disabled.set(true);

    const isCorrect = index === this.correctIndex();
    this.feedback.set(isCorrect ? 'correct' : 'incorrect');

    this.statsService.recordResult(isCorrect, this.typeString());

    this.exerciseState.handleResult(isCorrect, () => this.advance(), 1000, 2000);
  }

  private advance(): void {
    this.nextQuestion();
  }
}
