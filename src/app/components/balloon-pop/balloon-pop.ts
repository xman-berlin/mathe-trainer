import {
  Component,
  computed,
  signal,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProblemGeneratorService } from '../../services/problem-generator.service';
import { BALLOON_POP_CONFIG } from '../../models/game.model';
import { BaseGameComponent } from '../games/base-game.component';

interface Balloon {
  id: number;
  x: number;
  y: number;
  value: number;
  color: string;
  wobbleOffset: number;
  wobbleSpeed: number;
}

interface Question {
  text: string;
  answer: number;
}

@Component({
  standalone: true,
  selector: 'app-balloon-pop',
  imports: [RouterLink],
  templateUrl: './balloon-pop.html',
  styleUrl: './balloon-pop.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BalloonPopComponent extends BaseGameComponent {
  protected override readonly config = BALLOON_POP_CONFIG;
  override readonly canAfford = computed(() =>
    this.coinsService.canAfford(BALLOON_POP_CONFIG.COST_TO_PLAY)
  );

  // Game-specific state
  readonly lives = signal<number>(BALLOON_POP_CONFIG.INITIAL_LIVES);

  private problemGenerator = inject(ProblemGeneratorService);

  // Game objects
  private balloons: Balloon[] = [];
  private currentQuestion: Question | null = null;
  private balloonIdCounter = 0;
  private questionStartTime = 0;

  // Feedback state
  private feedbackText = '';
  private feedbackColor = '';
  private feedbackTimer = 0;

  // Animation
  private frameCount = 0;

  // Balloon colors
  private readonly BALLOON_COLORS = [
    '#FF6B6B', // Red
    '#4ECDC4', // Teal
    '#FFE66D', // Yellow
    '#95E1D3', // Mint
    '#F38181', // Coral
    '#AA96DA', // Purple
  ];

  // ============================================================================
  // INPUT HANDLERS
  // ============================================================================

  onCanvasClick(event: MouseEvent): void {
    if (this.gameState() === 'READY') {
      return;
    }
    if (this.gameState() !== 'PLAYING') return;

    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

    this.handleBalloonClick(x, y);
  }

  onCanvasTouch(event: TouchEvent): void {
    event.preventDefault();
    if (this.gameState() !== 'PLAYING') return;
    if (event.touches.length === 0) return;

    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (event.touches[0].clientX - rect.left) * scaleX;
    const y = (event.touches[0].clientY - rect.top) * scaleY;

    this.handleBalloonClick(x, y);
  }

  private handleBalloonClick(x: number, y: number): void {
    for (const balloon of this.balloons) {
      const dx = x - balloon.x;
      const dy = y - balloon.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < BALLOON_POP_CONFIG.BALLOON_WIDTH / 2) {
        this.popBalloon(balloon);
        return;
      }
    }
  }

  private popBalloon(balloon: Balloon): void {
    if (!this.currentQuestion) return;

    const isCorrect = balloon.value === this.currentQuestion.answer;

    if (isCorrect) {
      const timeElapsed = Date.now() - this.questionStartTime;
      let points = BALLOON_POP_CONFIG.POINTS_PER_CORRECT;
      if (timeElapsed < BALLOON_POP_CONFIG.TIME_BONUS_THRESHOLD) {
        points += BALLOON_POP_CONFIG.TIME_BONUS_POINTS;
      }

      this.score.update((s) => s + points);
      this.showFeedbackMsg('Richtig! +' + points, '#4ECDC4');

      this.balloons = [];
      this.generateQuestion();
    } else {
      this.lives.update((l) => l - 1);
      this.showFeedbackMsg('Falsch!', '#FF6B6B');

      this.balloons = this.balloons.filter((b) => b.id !== balloon.id);

      if (this.lives() <= 0) {
        this.endGame();
      }
    }
  }

  private showFeedbackMsg(text: string, color: string): void {
    this.feedbackText = text;
    this.feedbackColor = color;
    this.feedbackTimer = 60;
  }

  // ============================================================================
  // GAME CONTROL
  // ============================================================================

  override async startGame(): Promise<void> {
    this.stopGameLoop();

    const userId = this.authService.currentUser()?.id;
    if (!userId) {
      this.router.navigate(['/login']);
      return;
    }

    const success = await this.gameService.startGame(userId, BALLOON_POP_CONFIG.GAME_ID);
    if (!success) return;

    // Reset game state
    this.balloons = [];
    this.balloonIdCounter = 0;
    this.feedbackText = '';
    this.feedbackTimer = 0;
    this.frameCount = 0;

    this.score.set(0);
    this.lives.set(BALLOON_POP_CONFIG.INITIAL_LIVES);
    this.isNewHighScore.set(false);
    this.gameState.set('PLAYING');

    this.generateQuestion();
    this.startGameLoop();
  }

  private generateQuestion(): void {
    const problem = this.problemGenerator.generateProblem(['addition', 'subtraction', 'multiplication']);

    this.currentQuestion = { text: problem.text, answer: problem.answer };
    this.questionStartTime = Date.now();
    this.spawnBalloons(problem.answer);
  }

  // ============================================================================
  // GAME LOOP (abstract implementations)
  // ============================================================================

  protected override update(): void {
    if (this.gameState() !== 'PLAYING') return;

    this.frameCount++;

    if (this.feedbackTimer > 0) {
      this.feedbackTimer--;
    }

    let missedBalloon = false;
    for (const balloon of this.balloons) {
      balloon.y -= BALLOON_POP_CONFIG.BALLOON_RISE_SPEED;

      if (balloon.y + BALLOON_POP_CONFIG.BALLOON_HEIGHT / 2 < 80) {
        missedBalloon = true;
      }
    }

    if (missedBalloon && this.currentQuestion) {
      const correctBalloon = this.balloons.find((b) => b.value === this.currentQuestion!.answer);
      if (correctBalloon && correctBalloon.y + BALLOON_POP_CONFIG.BALLOON_HEIGHT / 2 < 80) {
        this.lives.update((l) => l - 1);
        this.showFeedbackMsg('Verpasst!', '#FF6B6B');
        this.balloons = [];

        if (this.lives() <= 0) {
          this.endGame();
          return;
        }

        this.generateQuestion();
      }
    }

    this.balloons = this.balloons.filter(
      (b) => b.y + BALLOON_POP_CONFIG.BALLOON_HEIGHT / 2 > 80
    );
  }

  protected override draw(): void {
    if (!this.ctx) return;

    const ctx = this.ctx;
    const width = BALLOON_POP_CONFIG.CANVAS_WIDTH;
    const height = BALLOON_POP_CONFIG.CANVAS_HEIGHT;

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(1, '#E0F6FF');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    this.drawCloud(ctx, 80, 120, 30);
    this.drawCloud(ctx, 350, 150, 25);
    this.drawCloud(ctx, 200, 100, 35);

    this.drawQuestionBox(ctx);

    for (const balloon of this.balloons) {
      this.drawBalloon(ctx, balloon);
    }

    this.drawHUD(ctx);

    if (this.feedbackTimer > 0) {
      ctx.fillStyle = this.feedbackColor;
      ctx.font = 'bold 32px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(this.feedbackText, width / 2, height / 2);
    }
  }

  protected override drawReadyScreen(): void {
    if (!this.ctx) return;

    const ctx = this.ctx;
    const width = BALLOON_POP_CONFIG.CANVAS_WIDTH;
    const height = BALLOON_POP_CONFIG.CANVAS_HEIGHT;

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(1, '#E0F6FF');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.font = '50px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('🎈', width / 2 - 60, height / 2 - 30);
    ctx.fillText('🎈', width / 2, height / 2 - 50);
    ctx.fillText('🎈', width / 2 + 60, height / 2 - 30);

    ctx.fillStyle = '#333';
    ctx.font = 'bold 32px Arial';
    ctx.fillText('Balloon Pop', width / 2, 80);

    ctx.fillStyle = '#666';
    ctx.font = '16px Arial';
    ctx.fillText('Platze den Ballon mit der richtigen Antwort!', width / 2, height / 2 + 50);

    if (this.highScore() > 0) {
      ctx.fillText(`Highscore: ${this.highScore()}`, width / 2, height / 2 + 80);
    }
  }

  protected override drawGameOverScreen(): void {
    if (!this.ctx) return;

    const ctx = this.ctx;
    const width = BALLOON_POP_CONFIG.CANVAS_WIDTH;
    const height = BALLOON_POP_CONFIG.CANVAS_HEIGHT;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = 'white';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Game Over', width / 2, height / 2 - 60);

    ctx.font = 'bold 28px Arial';
    ctx.fillText(`Punkte: ${this.score()}`, width / 2, height / 2 - 10);

    if (this.isNewHighScore()) {
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 20px Arial';
      ctx.fillText('Neuer Highscore! 🎉', width / 2, height / 2 + 30);
    } else {
      ctx.fillStyle = '#aaa';
      ctx.font = '18px Arial';
      ctx.fillText(`Highscore: ${this.highScore()}`, width / 2, height / 2 + 30);
    }
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private spawnBalloons(correctAnswer: number): void {
    const count = BALLOON_POP_CONFIG.MIN_BALLOONS +
      Math.floor(Math.random() * (BALLOON_POP_CONFIG.MAX_BALLOONS - BALLOON_POP_CONFIG.MIN_BALLOONS + 1));

    const answers = new Set<number>();
    answers.add(correctAnswer);

    let attempts = 0;
    const maxAttempts = 100;

    while (answers.size < count && attempts < maxAttempts) {
      attempts++;
      const offset = Math.floor(Math.random() * 20) - 10;
      if (offset === 0) continue;

      const wrongAnswer = correctAnswer + offset;
      if (wrongAnswer >= 0) {
        answers.add(wrongAnswer);
      }
    }

    let fallback = 1;
    while (answers.size < count) {
      if (!answers.has(fallback)) {
        answers.add(fallback);
      }
      fallback++;
    }

    const answerArray = Array.from(answers).sort(() => Math.random() - 0.5);
    const width = BALLOON_POP_CONFIG.CANVAS_WIDTH;
    const balloonWidth = BALLOON_POP_CONFIG.BALLOON_WIDTH;
    const spacing = (width - balloonWidth) / (answerArray.length + 1);

    for (let i = 0; i < answerArray.length; i++) {
      this.balloons.push({
        id: this.balloonIdCounter++,
        x: spacing * (i + 1) + balloonWidth / 2,
        y: BALLOON_POP_CONFIG.SPAWN_Y,
        value: answerArray[i],
        color: this.BALLOON_COLORS[i % this.BALLOON_COLORS.length],
        wobbleOffset: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.03 + Math.random() * 0.02,
      });
    }
  }

  private drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.arc(x + size * 0.8, y - size * 0.2, size * 0.7, 0, Math.PI * 2);
    ctx.arc(x + size * 1.5, y, size * 0.8, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawQuestionBox(ctx: CanvasRenderingContext2D): void {
    if (!this.currentQuestion) return;

    const width = BALLOON_POP_CONFIG.CANVAS_WIDTH;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.beginPath();
    ctx.roundRect(width / 2 - 150, 10, 300, 60, 12);
    ctx.fill();

    ctx.fillStyle = 'white';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.currentQuestion.text, width / 2, 40);
  }

  private drawBalloon(ctx: CanvasRenderingContext2D, balloon: Balloon): void {
    const { x, y, value, color, wobbleOffset, wobbleSpeed } = balloon;
    const balloonWidth = BALLOON_POP_CONFIG.BALLOON_WIDTH;
    const balloonHeight = BALLOON_POP_CONFIG.BALLOON_HEIGHT;

    const wobble = Math.sin(this.frameCount * wobbleSpeed + wobbleOffset) * 3;

    ctx.save();
    ctx.translate(x + wobble, y);

    ctx.strokeStyle = '#666';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, balloonHeight / 2 - 5);
    ctx.quadraticCurveTo(wobble * 2, balloonHeight / 2 + 20, 0, balloonHeight / 2 + 40);
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(0, 0, balloonWidth / 2, balloonHeight / 2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.ellipse(-balloonWidth / 6, -balloonHeight / 6, balloonWidth / 6, balloonHeight / 5, -0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-5, balloonHeight / 2 - 8);
    ctx.lineTo(5, balloonHeight / 2 - 8);
    ctx.lineTo(0, balloonHeight / 2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'white';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 3;
    ctx.strokeText(value.toString(), 0, 0);
    ctx.fillText(value.toString(), 0, 0);

    ctx.restore();
  }

  private drawHUD(ctx: CanvasRenderingContext2D): void {
    const width = BALLOON_POP_CONFIG.CANVAS_WIDTH;
    const height = BALLOON_POP_CONFIG.CANVAS_HEIGHT;

    ctx.fillStyle = '#333';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Punkte: ${this.score()}`, 15, height - 20);

    ctx.textAlign = 'right';
    ctx.fillText(`${'❤️'.repeat(this.lives())}`, width - 15, height - 20);
  }
}
