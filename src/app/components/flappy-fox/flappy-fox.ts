import {
  Component,
  computed,
  HostListener,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { FLAPPY_FOX_CONFIG, FlappyFoxState } from '../../models/game.model';
import { BaseGameComponent } from '../games/base-game.component';

interface Pipe {
  x: number;
  gapY: number;
  gap: number; // Size of the gap (varies with difficulty)
  passed: boolean;
}

@Component({
  standalone: true,
  selector: 'app-flappy-fox',
  imports: [RouterLink],
  templateUrl: './flappy-fox.html',
  styleUrl: './flappy-fox.scss',
})
export class FlappyFoxComponent extends BaseGameComponent<FlappyFoxState> {
  protected override readonly config = FLAPPY_FOX_CONFIG;
  override readonly canAfford = computed(() =>
    this.coinsService.canAfford(FLAPPY_FOX_CONFIG.COST_TO_PLAY)
  );

  // Game objects
  private foxY = 0;
  private foxVelocity = 0;
  private pipes: Pipe[] = [];
  private pipeSpawnTimer = 0;

  // Dynamic difficulty (changes with score)
  private currentPipeSpeed: number = FLAPPY_FOX_CONFIG.INITIAL_PIPE_SPEED;
  private currentPipeGap: number = FLAPPY_FOX_CONFIG.INITIAL_PIPE_GAP;
  private currentSpawnInterval: number = FLAPPY_FOX_CONFIG.INITIAL_SPAWN_INTERVAL;

  // ============================================================================
  // INPUT HANDLERS
  // ============================================================================

  @HostListener('window:keydown', ['$event'])
  handleKeydown(event: KeyboardEvent): void {
    if (event.code === 'Space' || event.key === ' ') {
      event.preventDefault();
      this.handleInput();
    }
  }

  onCanvasClick(): void {
    this.handleInput();
  }

  onCanvasTouch(event: TouchEvent): void {
    event.preventDefault();
    this.handleInput();
  }

  private handleInput(): void {
    const state = this.gameState();

    if (state === 'READY') {
      this.startGame();
    } else if (state === 'PLAYING') {
      this.flap();
    }
    // GAME_OVER: use buttons to restart or go back
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

    const success = await this.gameService.startGame(userId, FLAPPY_FOX_CONFIG.GAME_ID);
    if (!success) return; // Not enough coins

    // Reset game state
    this.foxY = FLAPPY_FOX_CONFIG.CANVAS_HEIGHT / 2;
    this.foxVelocity = FLAPPY_FOX_CONFIG.FLAP_VELOCITY / 2;
    this.pipes = [];
    this.pipeSpawnTimer = 80; // Delay first pipe spawn

    // Reset difficulty
    this.currentPipeSpeed = FLAPPY_FOX_CONFIG.INITIAL_PIPE_SPEED;
    this.currentPipeGap = FLAPPY_FOX_CONFIG.INITIAL_PIPE_GAP;
    this.currentSpawnInterval = FLAPPY_FOX_CONFIG.INITIAL_SPAWN_INTERVAL;

    this.score.set(0);
    this.isNewHighScore.set(false);
    this.gameState.set('PLAYING');

    this.startGameLoop();
  }

  private flap(): void {
    this.foxVelocity = FLAPPY_FOX_CONFIG.FLAP_VELOCITY;
  }

  // ============================================================================
  // GAME LOOP (abstract implementations)
  // ============================================================================

  protected override update(): void {
    if (this.gameState() !== 'PLAYING') return;

    this.foxVelocity += FLAPPY_FOX_CONFIG.GRAVITY;
    this.foxY += this.foxVelocity;

    if (this.foxY < 0 || this.foxY + FLAPPY_FOX_CONFIG.FOX_SIZE > FLAPPY_FOX_CONFIG.CANVAS_HEIGHT) {
      this.endGame();
      return;
    }

    this.pipeSpawnTimer++;
    if (this.pipeSpawnTimer >= this.currentSpawnInterval) {
      this.spawnPipe();
      this.pipeSpawnTimer = 0;
    }

    for (const pipe of this.pipes) {
      pipe.x -= this.currentPipeSpeed;

      if (!pipe.passed && pipe.x + FLAPPY_FOX_CONFIG.PIPE_WIDTH < FLAPPY_FOX_CONFIG.CANVAS_WIDTH / 4) {
        pipe.passed = true;
        this.score.update((s) => s + 1);
        this.updateDifficulty();
      }

      if (this.checkCollision(pipe)) {
        this.endGame();
        return;
      }
    }

    this.pipes = this.pipes.filter((p) => p.x + FLAPPY_FOX_CONFIG.PIPE_WIDTH > 0);
  }

  protected override draw(): void {
    if (!this.ctx) return;

    const ctx = this.ctx;
    const { CANVAS_WIDTH: width, CANVAS_HEIGHT: height } = FLAPPY_FOX_CONFIG;

    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#8B4513';
    ctx.fillRect(0, height - 20, width, 20);
    ctx.fillStyle = '#228B22';
    ctx.fillRect(0, height - 30, width, 10);

    for (const pipe of this.pipes) {
      this.drawPipe(pipe);
    }
    this.drawFox();

    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 3;
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    const scoreText = this.score().toString();
    ctx.strokeText(scoreText, width / 2, 60);
    ctx.fillText(scoreText, width / 2, 60);
  }

  protected override drawReadyScreen(): void {
    if (!this.ctx) return;

    const ctx = this.ctx;
    const { CANVAS_WIDTH: width, CANVAS_HEIGHT: height } = FLAPPY_FOX_CONFIG;

    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(0, height - 20, width, 20);
    ctx.fillStyle = '#228B22';
    ctx.fillRect(0, height - 30, width, 10);

    ctx.font = '80px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🦊', width / 2, height / 2 - 50);

    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 3;
    ctx.font = 'bold 36px Arial';
    ctx.strokeText('Flappy Fox', width / 2, 80);
    ctx.fillText('Flappy Fox', width / 2, 80);

    ctx.font = '20px Arial';
    ctx.lineWidth = 2;
    ctx.strokeText('Drücke Space oder tippe zum Spielen', width / 2, height / 2 + 50);
    ctx.fillText('Drücke Space oder tippe zum Spielen', width / 2, height / 2 + 50);

    if (this.highScore() > 0) {
      ctx.font = '18px Arial';
      ctx.strokeText(`Highscore: ${this.highScore()}`, width / 2, height / 2 + 90);
      ctx.fillText(`Highscore: ${this.highScore()}`, width / 2, height / 2 + 90);
    }
  }

  protected override drawGameOverScreen(): void {
    if (!this.ctx) return;

    const ctx = this.ctx;
    const { CANVAS_WIDTH: width, CANVAS_HEIGHT: height } = FLAPPY_FOX_CONFIG;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 3;
    ctx.font = 'bold 42px Arial';
    ctx.textAlign = 'center';
    ctx.strokeText('Game Over', width / 2, height / 2 - 80);
    ctx.fillText('Game Over', width / 2, height / 2 - 80);

    ctx.font = 'bold 32px Arial';
    ctx.strokeText(`Punkte: ${this.score()}`, width / 2, height / 2 - 20);
    ctx.fillText(`Punkte: ${this.score()}`, width / 2, height / 2 - 20);

    if (this.isNewHighScore()) {
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 24px Arial';
      ctx.strokeText('Neuer Highscore! 🎉', width / 2, height / 2 + 30);
      ctx.fillText('Neuer Highscore! 🎉', width / 2, height / 2 + 30);
    } else {
      ctx.fillStyle = 'white';
      ctx.font = '20px Arial';
      ctx.strokeText(`Highscore: ${this.highScore()}`, width / 2, height / 2 + 30);
      ctx.fillText(`Highscore: ${this.highScore()}`, width / 2, height / 2 + 30);
    }
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private spawnPipe(): void {
    const gap = this.currentPipeGap;
    const minGapY = 80;
    const maxGapY = FLAPPY_FOX_CONFIG.CANVAS_HEIGHT - gap - 80;
    const gapY = Math.random() * (maxGapY - minGapY) + minGapY;

    this.pipes.push({ x: FLAPPY_FOX_CONFIG.CANVAS_WIDTH, gapY, gap, passed: false });
  }

  private checkCollision(pipe: Pipe): boolean {
    const foxX = FLAPPY_FOX_CONFIG.CANVAS_WIDTH / 4;
    const foxSize = FLAPPY_FOX_CONFIG.FOX_SIZE;
    const foxLeft = foxX, foxRight = foxX + foxSize;
    const foxTop = this.foxY, foxBottom = this.foxY + foxSize;
    const pipeLeft = pipe.x, pipeRight = pipe.x + FLAPPY_FOX_CONFIG.PIPE_WIDTH;

    if (foxRight > pipeLeft && foxLeft < pipeRight) {
      const gapTop = pipe.gapY, gapBottom = pipe.gapY + pipe.gap;
      if (foxTop < gapTop || foxBottom > gapBottom) return true;
    }
    return false;
  }

  private updateDifficulty(): void {
    const level = Math.min(Math.floor(this.score() / 5), 10);
    const progress = level / 10;

    const { INITIAL_PIPE_SPEED, MAX_PIPE_SPEED, INITIAL_PIPE_GAP, MIN_PIPE_GAP,
            INITIAL_SPAWN_INTERVAL, MIN_SPAWN_INTERVAL } = FLAPPY_FOX_CONFIG;

    this.currentPipeSpeed   = INITIAL_PIPE_SPEED + (MAX_PIPE_SPEED - INITIAL_PIPE_SPEED) * progress;
    this.currentPipeGap     = INITIAL_PIPE_GAP - (INITIAL_PIPE_GAP - MIN_PIPE_GAP) * progress;
    this.currentSpawnInterval = INITIAL_SPAWN_INTERVAL - (INITIAL_SPAWN_INTERVAL - MIN_SPAWN_INTERVAL) * progress;
  }

  private drawFox(): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const foxX = FLAPPY_FOX_CONFIG.CANVAS_WIDTH / 4;
    const foxSize = FLAPPY_FOX_CONFIG.FOX_SIZE;

    ctx.font = `${foxSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.save();
    ctx.translate(foxX + foxSize / 2, this.foxY + foxSize / 2);
    ctx.rotate(Math.min(Math.max(this.foxVelocity * 0.05, -0.5), 0.5));
    ctx.fillText('🦊', 0, 0);
    ctx.restore();
  }

  private drawPipe(pipe: Pipe): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const { PIPE_WIDTH: pipeWidth, CANVAS_HEIGHT: height } = FLAPPY_FOX_CONFIG;
    const pipeGap = pipe.gap;

    ctx.fillStyle = '#228B22';
    ctx.strokeStyle = '#006400';
    ctx.lineWidth = 3;

    ctx.fillRect(pipe.x, 0, pipeWidth, pipe.gapY);
    ctx.strokeRect(pipe.x, 0, pipeWidth, pipe.gapY);
    ctx.fillRect(pipe.x - 5, pipe.gapY - 30, pipeWidth + 10, 30);
    ctx.strokeRect(pipe.x - 5, pipe.gapY - 30, pipeWidth + 10, 30);

    const bottomPipeY = pipe.gapY + pipeGap;
    ctx.fillRect(pipe.x, bottomPipeY, pipeWidth, height - bottomPipeY - 30);
    ctx.strokeRect(pipe.x, bottomPipeY, pipeWidth, height - bottomPipeY - 30);
    ctx.fillRect(pipe.x - 5, bottomPipeY, pipeWidth + 10, 30);
    ctx.strokeRect(pipe.x - 5, bottomPipeY, pipeWidth + 10, 30);
  }
}
