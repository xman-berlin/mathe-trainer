import {
  Component,
  signal,
  computed,
  inject,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  HostListener,
  AfterViewInit,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { GameService } from '../../services/game.service';
import { CoinsService } from '../../services/coins.service';
import { AuthService } from '../../services/auth.service';
import { FLAPPY_FOX_CONFIG, FlappyFoxState } from '../../models/game.model';

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
  styleUrl: './flappy-fox.css',
})
export class FlappyFoxComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('gameCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  readonly gameService = inject(GameService);
  private coinsService = inject(CoinsService);
  private authService = inject(AuthService);
  private router = inject(Router);

  // Game state
  readonly gameState = signal<FlappyFoxState>('READY');
  readonly score = signal(0);
  readonly highScore = signal(0);
  readonly isNewHighScore = signal(false);
  readonly canAfford = computed(() => this.coinsService.canAfford(FLAPPY_FOX_CONFIG.COST_TO_PLAY));
  readonly coinBalance = this.coinsService.balance;

  // Config
  readonly config = FLAPPY_FOX_CONFIG;

  // Canvas context
  private ctx: CanvasRenderingContext2D | null = null;
  private animationFrameId: number | null = null;

  // Game objects
  private foxY = 0;
  private foxVelocity = 0;
  private pipes: Pipe[] = [];
  private pipeSpawnTimer = 0;

  // Dynamic difficulty (changes with score)
  private currentPipeSpeed: number = FLAPPY_FOX_CONFIG.INITIAL_PIPE_SPEED;
  private currentPipeGap: number = FLAPPY_FOX_CONFIG.INITIAL_PIPE_GAP;
  private currentSpawnInterval: number = FLAPPY_FOX_CONFIG.INITIAL_SPAWN_INTERVAL;

  ngOnInit(): void {
    const userId = this.authService.currentUser()?.id;
    if (userId) {
      this.highScore.set(this.gameService.getHighScore(FLAPPY_FOX_CONFIG.GAME_ID));
    }
  }

  ngAfterViewInit(): void {
    this.initCanvas();
    this.drawReadyScreen();
  }

  ngOnDestroy(): void {
    this.stopGameLoop();
  }

  private initCanvas(): void {
    const canvas = this.canvasRef.nativeElement;
    canvas.width = FLAPPY_FOX_CONFIG.CANVAS_WIDTH;
    canvas.height = FLAPPY_FOX_CONFIG.CANVAS_HEIGHT;
    this.ctx = canvas.getContext('2d');
  }

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
    } else if (state === 'GAME_OVER') {
      // Do nothing - use buttons to restart or go back
    }
  }

  // ============================================================================
  // GAME CONTROL
  // ============================================================================

  async startGame(): Promise<void> {
    // Stop any existing game loop first
    this.stopGameLoop();

    const userId = this.authService.currentUser()?.id;
    if (!userId) {
      this.router.navigate(['/login']);
      return;
    }

    // Deduct coins
    const success = await this.gameService.startGame(userId, FLAPPY_FOX_CONFIG.GAME_ID);
    if (!success) {
      return; // Not enough coins
    }

    // Reset game state
    this.foxY = FLAPPY_FOX_CONFIG.CANVAS_HEIGHT / 2;
    this.foxVelocity = FLAPPY_FOX_CONFIG.FLAP_VELOCITY / 2; // Small initial lift
    this.pipes = [];
    this.pipeSpawnTimer = 80; // Delay first pipe spawn

    // Reset difficulty to easy
    this.currentPipeSpeed = FLAPPY_FOX_CONFIG.INITIAL_PIPE_SPEED;
    this.currentPipeGap = FLAPPY_FOX_CONFIG.INITIAL_PIPE_GAP;
    this.currentSpawnInterval = FLAPPY_FOX_CONFIG.INITIAL_SPAWN_INTERVAL;

    this.score.set(0);
    this.isNewHighScore.set(false);
    this.gameState.set('PLAYING');

    // Start game loop
    this.startGameLoop();
  }

  async restartGame(): Promise<void> {
    await this.startGame();
  }

  goBack(): void {
    this.router.navigate(['/erfolge'], { queryParams: { tab: 'games' } });
  }

  private flap(): void {
    this.foxVelocity = FLAPPY_FOX_CONFIG.FLAP_VELOCITY;
  }

  private async endGame(): Promise<void> {
    this.gameState.set('GAME_OVER');
    this.stopGameLoop();

    const userId = this.authService.currentUser()?.id;
    if (userId) {
      const isNewHighScore = await this.gameService.saveScore(
        userId,
        FLAPPY_FOX_CONFIG.GAME_ID,
        this.score()
      );
      this.isNewHighScore.set(isNewHighScore);
      if (isNewHighScore) {
        this.highScore.set(this.score());
      }
    }

    this.drawGameOverScreen();
  }

  // ============================================================================
  // GAME LOOP
  // ============================================================================

  private startGameLoop(): void {
    const gameLoop = () => {
      this.update();
      this.draw();
      this.animationFrameId = requestAnimationFrame(gameLoop);
    };
    this.animationFrameId = requestAnimationFrame(gameLoop);
  }

  private stopGameLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private update(): void {
    if (this.gameState() !== 'PLAYING') return;

    // Apply gravity
    this.foxVelocity += FLAPPY_FOX_CONFIG.GRAVITY;
    this.foxY += this.foxVelocity;

    // Check floor/ceiling collision
    if (this.foxY < 0 || this.foxY + FLAPPY_FOX_CONFIG.FOX_SIZE > FLAPPY_FOX_CONFIG.CANVAS_HEIGHT) {
      this.endGame();
      return;
    }

    // Spawn pipes
    this.pipeSpawnTimer++;
    if (this.pipeSpawnTimer >= this.currentSpawnInterval) {
      this.spawnPipe();
      this.pipeSpawnTimer = 0;
    }

    // Update pipes
    for (const pipe of this.pipes) {
      pipe.x -= this.currentPipeSpeed;

      // Check if fox passed pipe
      if (!pipe.passed && pipe.x + FLAPPY_FOX_CONFIG.PIPE_WIDTH < FLAPPY_FOX_CONFIG.CANVAS_WIDTH / 4) {
        pipe.passed = true;
        this.score.update((s) => s + 1);
        this.updateDifficulty();
      }

      // Check collision
      if (this.checkCollision(pipe)) {
        this.endGame();
        return;
      }
    }

    // Remove off-screen pipes
    this.pipes = this.pipes.filter((p) => p.x + FLAPPY_FOX_CONFIG.PIPE_WIDTH > 0);
  }

  private spawnPipe(): void {
    const gap = this.currentPipeGap;
    const minGapY = 80;
    const maxGapY = FLAPPY_FOX_CONFIG.CANVAS_HEIGHT - gap - 80;
    const gapY = Math.random() * (maxGapY - minGapY) + minGapY;

    this.pipes.push({
      x: FLAPPY_FOX_CONFIG.CANVAS_WIDTH,
      gapY,
      gap,
      passed: false,
    });
  }

  private checkCollision(pipe: Pipe): boolean {
    const foxX = FLAPPY_FOX_CONFIG.CANVAS_WIDTH / 4;
    const foxSize = FLAPPY_FOX_CONFIG.FOX_SIZE;
    const pipeWidth = FLAPPY_FOX_CONFIG.PIPE_WIDTH;
    const pipeGap = pipe.gap;

    // Fox bounding box
    const foxLeft = foxX;
    const foxRight = foxX + foxSize;
    const foxTop = this.foxY;
    const foxBottom = this.foxY + foxSize;

    // Pipe bounding box
    const pipeLeft = pipe.x;
    const pipeRight = pipe.x + pipeWidth;

    // Check horizontal overlap
    if (foxRight > pipeLeft && foxLeft < pipeRight) {
      // Check if fox is in the gap
      const gapTop = pipe.gapY;
      const gapBottom = pipe.gapY + pipeGap;

      if (foxTop < gapTop || foxBottom > gapBottom) {
        return true; // Collision!
      }
    }

    return false;
  }

  private updateDifficulty(): void {
    const currentScore = this.score();

    // Progressive difficulty: increases every 5 points
    // Score 0-4: easiest, Score 5-9: slightly harder, etc.
    const difficultyLevel = Math.floor(currentScore / 5);
    const maxDifficultyLevel = 10; // Cap at level 10
    const level = Math.min(difficultyLevel, maxDifficultyLevel);

    // Calculate progress (0 to 1)
    const progress = level / maxDifficultyLevel;

    // Interpolate between initial and max values
    const { INITIAL_PIPE_SPEED, MAX_PIPE_SPEED, INITIAL_PIPE_GAP, MIN_PIPE_GAP, INITIAL_SPAWN_INTERVAL, MIN_SPAWN_INTERVAL } = FLAPPY_FOX_CONFIG;

    this.currentPipeSpeed = INITIAL_PIPE_SPEED + (MAX_PIPE_SPEED - INITIAL_PIPE_SPEED) * progress;
    this.currentPipeGap = INITIAL_PIPE_GAP - (INITIAL_PIPE_GAP - MIN_PIPE_GAP) * progress;
    this.currentSpawnInterval = INITIAL_SPAWN_INTERVAL - (INITIAL_SPAWN_INTERVAL - MIN_SPAWN_INTERVAL) * progress;
  }

  // ============================================================================
  // RENDERING
  // ============================================================================

  private draw(): void {
    if (!this.ctx) return;

    const ctx = this.ctx;
    const width = FLAPPY_FOX_CONFIG.CANVAS_WIDTH;
    const height = FLAPPY_FOX_CONFIG.CANVAS_HEIGHT;

    // Clear canvas
    ctx.fillStyle = '#87CEEB'; // Sky blue
    ctx.fillRect(0, 0, width, height);

    // Draw ground
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(0, height - 20, width, 20);

    // Draw grass
    ctx.fillStyle = '#228B22';
    ctx.fillRect(0, height - 30, width, 10);

    // Draw pipes
    for (const pipe of this.pipes) {
      this.drawPipe(pipe);
    }

    // Draw fox
    this.drawFox();

    // Draw score
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 3;
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    const scoreText = this.score().toString();
    ctx.strokeText(scoreText, width / 2, 60);
    ctx.fillText(scoreText, width / 2, 60);
  }

  private drawFox(): void {
    if (!this.ctx) return;

    const ctx = this.ctx;
    const foxX = FLAPPY_FOX_CONFIG.CANVAS_WIDTH / 4;
    const foxSize = FLAPPY_FOX_CONFIG.FOX_SIZE;

    // Draw fox emoji
    ctx.font = `${foxSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Rotate based on velocity
    ctx.save();
    ctx.translate(foxX + foxSize / 2, this.foxY + foxSize / 2);
    const rotation = Math.min(Math.max(this.foxVelocity * 0.05, -0.5), 0.5);
    ctx.rotate(rotation);
    ctx.fillText('🦊', 0, 0);
    ctx.restore();
  }

  private drawPipe(pipe: Pipe): void {
    if (!this.ctx) return;

    const ctx = this.ctx;
    const pipeWidth = FLAPPY_FOX_CONFIG.PIPE_WIDTH;
    const pipeGap = pipe.gap;
    const height = FLAPPY_FOX_CONFIG.CANVAS_HEIGHT;

    // Pipe color
    ctx.fillStyle = '#228B22';
    ctx.strokeStyle = '#006400';
    ctx.lineWidth = 3;

    // Top pipe
    ctx.fillRect(pipe.x, 0, pipeWidth, pipe.gapY);
    ctx.strokeRect(pipe.x, 0, pipeWidth, pipe.gapY);

    // Top pipe cap
    ctx.fillRect(pipe.x - 5, pipe.gapY - 30, pipeWidth + 10, 30);
    ctx.strokeRect(pipe.x - 5, pipe.gapY - 30, pipeWidth + 10, 30);

    // Bottom pipe
    const bottomPipeY = pipe.gapY + pipeGap;
    ctx.fillRect(pipe.x, bottomPipeY, pipeWidth, height - bottomPipeY - 30);
    ctx.strokeRect(pipe.x, bottomPipeY, pipeWidth, height - bottomPipeY - 30);

    // Bottom pipe cap
    ctx.fillRect(pipe.x - 5, bottomPipeY, pipeWidth + 10, 30);
    ctx.strokeRect(pipe.x - 5, bottomPipeY, pipeWidth + 10, 30);
  }

  private drawReadyScreen(): void {
    if (!this.ctx) return;

    const ctx = this.ctx;
    const width = FLAPPY_FOX_CONFIG.CANVAS_WIDTH;
    const height = FLAPPY_FOX_CONFIG.CANVAS_HEIGHT;

    // Draw background
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, width, height);

    // Draw ground
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(0, height - 20, width, 20);
    ctx.fillStyle = '#228B22';
    ctx.fillRect(0, height - 30, width, 10);

    // Draw fox in center
    ctx.font = '80px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🦊', width / 2, height / 2 - 50);

    // Draw title
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 3;
    ctx.font = 'bold 36px Arial';
    ctx.strokeText('Flappy Fox', width / 2, 80);
    ctx.fillText('Flappy Fox', width / 2, 80);

    // Draw instructions
    ctx.font = '20px Arial';
    ctx.lineWidth = 2;
    ctx.strokeText('Drücke Space oder tippe zum Spielen', width / 2, height / 2 + 50);
    ctx.fillText('Drücke Space oder tippe zum Spielen', width / 2, height / 2 + 50);

    // Draw high score
    if (this.highScore() > 0) {
      ctx.font = '18px Arial';
      ctx.strokeText(`Highscore: ${this.highScore()}`, width / 2, height / 2 + 90);
      ctx.fillText(`Highscore: ${this.highScore()}`, width / 2, height / 2 + 90);
    }
  }

  private drawGameOverScreen(): void {
    if (!this.ctx) return;

    const ctx = this.ctx;
    const width = FLAPPY_FOX_CONFIG.CANVAS_WIDTH;
    const height = FLAPPY_FOX_CONFIG.CANVAS_HEIGHT;

    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, width, height);

    // Game Over text
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 3;
    ctx.font = 'bold 42px Arial';
    ctx.textAlign = 'center';
    ctx.strokeText('Game Over', width / 2, height / 2 - 80);
    ctx.fillText('Game Over', width / 2, height / 2 - 80);

    // Score
    ctx.font = 'bold 32px Arial';
    ctx.strokeText(`Punkte: ${this.score()}`, width / 2, height / 2 - 20);
    ctx.fillText(`Punkte: ${this.score()}`, width / 2, height / 2 - 20);

    // New high score?
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
}
