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
import { BREAKOUT_CONFIG, GameState } from '../../models/game.model';

interface Block {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  points: number;
  destroyed: boolean;
}

interface Ball {
  x: number;
  y: number;
  dx: number;
  dy: number;
  radius: number;
}

@Component({
  standalone: true,
  selector: 'app-breakout',
  imports: [RouterLink],
  templateUrl: './breakout.html',
  styleUrl: './breakout.css',
})
export class BreakoutComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('gameCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  readonly gameService = inject(GameService);
  private coinsService = inject(CoinsService);
  private authService = inject(AuthService);
  private router = inject(Router);

  // Game state
  readonly gameState = signal<GameState>('READY');
  readonly score = signal(0);
  readonly highScore = signal(0);
  readonly isNewHighScore = signal(false);
  readonly lives = signal<number>(BREAKOUT_CONFIG.INITIAL_LIVES);
  readonly canAfford = computed(() => this.coinsService.canAfford(BREAKOUT_CONFIG.COST_TO_PLAY));
  readonly coinBalance = this.coinsService.balance;

  // Config
  readonly config = BREAKOUT_CONFIG;

  // Canvas context
  private ctx: CanvasRenderingContext2D | null = null;
  private animationFrameId: number | null = null;

  // Game objects
  private paddleX = 0;
  private ball: Ball = { x: 0, y: 0, dx: 0, dy: 0, radius: BREAKOUT_CONFIG.BALL_RADIUS };
  private blocks: Block[] = [];

  // Input tracking
  private leftPressed = false;
  private rightPressed = false;
  private mouseX: number | null = null;

  // Block colors (top to bottom)
  private readonly BLOCK_COLORS = ['#FF6B6B', '#FFE66D', '#4ECDC4', '#45B7D1', '#96CEB4'];

  ngOnInit(): void {
    const userId = this.authService.currentUser()?.id;
    if (userId) {
      this.highScore.set(this.gameService.getHighScore(BREAKOUT_CONFIG.GAME_ID));
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
    canvas.width = BREAKOUT_CONFIG.CANVAS_WIDTH;
    canvas.height = BREAKOUT_CONFIG.CANVAS_HEIGHT;
    this.ctx = canvas.getContext('2d');
  }

  // ============================================================================
  // INPUT HANDLERS
  // ============================================================================

  @HostListener('window:keydown', ['$event'])
  handleKeydown(event: KeyboardEvent): void {
    if (event.code === 'ArrowLeft' || event.key === 'a') {
      this.leftPressed = true;
    } else if (event.code === 'ArrowRight' || event.key === 'd') {
      this.rightPressed = true;
    } else if (event.code === 'Space' || event.key === ' ') {
      event.preventDefault();
      if (this.gameState() === 'READY') {
        this.startGame();
      }
    }
  }

  @HostListener('window:keyup', ['$event'])
  handleKeyup(event: KeyboardEvent): void {
    if (event.code === 'ArrowLeft' || event.key === 'a') {
      this.leftPressed = false;
    } else if (event.code === 'ArrowRight' || event.key === 'd') {
      this.rightPressed = false;
    }
  }

  onCanvasMouseMove(event: MouseEvent): void {
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    this.mouseX = (event.clientX - rect.left) * scaleX;
  }

  onCanvasTouch(event: TouchEvent): void {
    event.preventDefault();
    if (event.touches.length > 0) {
      const canvas = this.canvasRef.nativeElement;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      this.mouseX = (event.touches[0].clientX - rect.left) * scaleX;
    }
  }

  onCanvasClick(): void {
    if (this.gameState() === 'READY') {
      this.startGame();
    }
  }

  // ============================================================================
  // GAME CONTROL
  // ============================================================================

  async startGame(): Promise<void> {
    this.stopGameLoop();

    const userId = this.authService.currentUser()?.id;
    if (!userId) {
      this.router.navigate(['/login']);
      return;
    }

    const success = await this.gameService.startGame(userId, BREAKOUT_CONFIG.GAME_ID);
    if (!success) {
      return;
    }

    // Reset game state
    this.paddleX = (BREAKOUT_CONFIG.CANVAS_WIDTH - BREAKOUT_CONFIG.PADDLE_WIDTH) / 2;
    this.resetBall();
    this.createBlocks();

    this.score.set(0);
    this.lives.set(BREAKOUT_CONFIG.INITIAL_LIVES);
    this.isNewHighScore.set(false);
    this.gameState.set('PLAYING');

    this.startGameLoop();
  }

  async restartGame(): Promise<void> {
    await this.startGame();
  }

  goBack(): void {
    this.router.navigate(['/erfolge'], { queryParams: { tab: 'games' } });
  }

  private resetBall(): void {
    this.ball = {
      x: BREAKOUT_CONFIG.CANVAS_WIDTH / 2,
      y: BREAKOUT_CONFIG.PADDLE_Y - 20,
      dx: (Math.random() > 0.5 ? 1 : -1) * BREAKOUT_CONFIG.BALL_SPEED * 0.7,
      dy: -BREAKOUT_CONFIG.BALL_SPEED,
      radius: BREAKOUT_CONFIG.BALL_RADIUS,
    };
  }

  private createBlocks(): void {
    this.blocks = [];
    const { BLOCK_ROWS, BLOCK_COLS, BLOCK_WIDTH, BLOCK_HEIGHT, BLOCK_PADDING, BLOCK_OFFSET_TOP, BLOCK_OFFSET_LEFT, BLOCK_POINTS } = BREAKOUT_CONFIG;

    for (let row = 0; row < BLOCK_ROWS; row++) {
      for (let col = 0; col < BLOCK_COLS; col++) {
        this.blocks.push({
          x: BLOCK_OFFSET_LEFT + col * (BLOCK_WIDTH + BLOCK_PADDING),
          y: BLOCK_OFFSET_TOP + row * (BLOCK_HEIGHT + BLOCK_PADDING),
          width: BLOCK_WIDTH,
          height: BLOCK_HEIGHT,
          color: this.BLOCK_COLORS[row],
          points: BLOCK_POINTS[row],
          destroyed: false,
        });
      }
    }
  }

  private async endGame(): Promise<void> {
    this.gameState.set('GAME_OVER');
    this.stopGameLoop();

    const userId = this.authService.currentUser()?.id;
    if (userId) {
      const isNewHighScore = await this.gameService.saveScore(
        userId,
        BREAKOUT_CONFIG.GAME_ID,
        this.score()
      );
      this.isNewHighScore.set(isNewHighScore);
      if (isNewHighScore) {
        this.highScore.set(this.score());
      }
    }

    this.drawGameOverScreen();
  }

  private checkWin(): boolean {
    return this.blocks.every((block) => block.destroyed);
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

    // Update paddle position
    this.updatePaddle();

    // Update ball position
    this.ball.x += this.ball.dx;
    this.ball.y += this.ball.dy;

    // Wall collisions
    if (this.ball.x - this.ball.radius <= 0 || this.ball.x + this.ball.radius >= BREAKOUT_CONFIG.CANVAS_WIDTH) {
      this.ball.dx = -this.ball.dx;
      this.ball.x = Math.max(this.ball.radius, Math.min(BREAKOUT_CONFIG.CANVAS_WIDTH - this.ball.radius, this.ball.x));
    }
    if (this.ball.y - this.ball.radius <= 0) {
      this.ball.dy = -this.ball.dy;
      this.ball.y = this.ball.radius;
    }

    // Bottom - lose life
    if (this.ball.y + this.ball.radius >= BREAKOUT_CONFIG.CANVAS_HEIGHT) {
      this.lives.update((l) => l - 1);
      if (this.lives() <= 0) {
        this.endGame();
        return;
      }
      this.resetBall();
    }

    // Paddle collision
    if (
      this.ball.y + this.ball.radius >= BREAKOUT_CONFIG.PADDLE_Y &&
      this.ball.y - this.ball.radius <= BREAKOUT_CONFIG.PADDLE_Y + BREAKOUT_CONFIG.PADDLE_HEIGHT &&
      this.ball.x >= this.paddleX &&
      this.ball.x <= this.paddleX + BREAKOUT_CONFIG.PADDLE_WIDTH
    ) {
      // Calculate angle based on where ball hits paddle
      const hitPos = (this.ball.x - this.paddleX) / BREAKOUT_CONFIG.PADDLE_WIDTH;
      const angle = (hitPos - 0.5) * Math.PI * 0.7; // -63° to 63°
      const speed = Math.sqrt(this.ball.dx * this.ball.dx + this.ball.dy * this.ball.dy);

      this.ball.dx = speed * Math.sin(angle);
      this.ball.dy = -Math.abs(speed * Math.cos(angle));
      this.ball.y = BREAKOUT_CONFIG.PADDLE_Y - this.ball.radius;
    }

    // Block collisions
    for (const block of this.blocks) {
      if (block.destroyed) continue;

      if (this.checkBlockCollision(block)) {
        block.destroyed = true;
        this.score.update((s) => s + block.points);
        this.ball.dy = -this.ball.dy;

        // Check win
        if (this.checkWin()) {
          // Bonus for completing level
          this.score.update((s) => s + 100);
          this.endGame();
          return;
        }
        break; // Only one block per frame
      }
    }
  }

  private updatePaddle(): void {
    const speed = BREAKOUT_CONFIG.PADDLE_SPEED;

    if (this.mouseX !== null) {
      // Mouse/touch control
      this.paddleX = this.mouseX - BREAKOUT_CONFIG.PADDLE_WIDTH / 2;
    } else {
      // Keyboard control
      if (this.leftPressed) {
        this.paddleX -= speed;
      }
      if (this.rightPressed) {
        this.paddleX += speed;
      }
    }

    // Keep paddle in bounds
    this.paddleX = Math.max(0, Math.min(BREAKOUT_CONFIG.CANVAS_WIDTH - BREAKOUT_CONFIG.PADDLE_WIDTH, this.paddleX));
  }

  private checkBlockCollision(block: Block): boolean {
    return (
      this.ball.x + this.ball.radius > block.x &&
      this.ball.x - this.ball.radius < block.x + block.width &&
      this.ball.y + this.ball.radius > block.y &&
      this.ball.y - this.ball.radius < block.y + block.height
    );
  }

  // ============================================================================
  // RENDERING
  // ============================================================================

  private draw(): void {
    if (!this.ctx) return;

    const ctx = this.ctx;
    const width = BREAKOUT_CONFIG.CANVAS_WIDTH;
    const height = BREAKOUT_CONFIG.CANVAS_HEIGHT;

    // Background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);

    // Draw blocks
    for (const block of this.blocks) {
      if (!block.destroyed) {
        this.drawBlock(ctx, block);
      }
    }

    // Draw paddle
    ctx.fillStyle = '#4ECDC4';
    ctx.beginPath();
    ctx.roundRect(this.paddleX, BREAKOUT_CONFIG.PADDLE_Y, BREAKOUT_CONFIG.PADDLE_WIDTH, BREAKOUT_CONFIG.PADDLE_HEIGHT, 6);
    ctx.fill();

    // Draw ball
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
    ctx.fill();

    // Draw score and lives
    ctx.fillStyle = 'white';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Punkte: ${this.score()}`, 15, 30);

    ctx.textAlign = 'right';
    ctx.fillText(`${'❤️'.repeat(this.lives())}`, width - 15, 30);
  }

  private drawBlock(ctx: CanvasRenderingContext2D, block: Block): void {
    ctx.fillStyle = block.color;
    ctx.beginPath();
    ctx.roundRect(block.x, block.y, block.width, block.height, 4);
    ctx.fill();

    // Add subtle highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(block.x + 2, block.y + 2, block.width - 4, 3);
  }

  private drawReadyScreen(): void {
    if (!this.ctx) return;

    const ctx = this.ctx;
    const width = BREAKOUT_CONFIG.CANVAS_WIDTH;
    const height = BREAKOUT_CONFIG.CANVAS_HEIGHT;

    // Background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);

    // Draw sample blocks
    const sampleBlocks = [
      { x: width / 2 - 90, y: height / 2 - 60, color: '#FF6B6B' },
      { x: width / 2 - 30, y: height / 2 - 60, color: '#FFE66D' },
      { x: width / 2 + 30, y: height / 2 - 60, color: '#4ECDC4' },
    ];
    for (const block of sampleBlocks) {
      ctx.fillStyle = block.color;
      ctx.beginPath();
      ctx.roundRect(block.x, block.y, 50, 20, 4);
      ctx.fill();
    }

    // Title
    ctx.fillStyle = 'white';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Breakout', width / 2, 80);

    // Instructions
    ctx.fillStyle = '#aaa';
    ctx.font = '16px Arial';
    ctx.fillText('← → oder Maus zum Steuern', width / 2, height / 2 + 40);

    // High score
    if (this.highScore() > 0) {
      ctx.fillText(`Highscore: ${this.highScore()}`, width / 2, height / 2 + 70);
    }
  }

  private drawGameOverScreen(): void {
    if (!this.ctx) return;

    const ctx = this.ctx;
    const width = BREAKOUT_CONFIG.CANVAS_WIDTH;
    const height = BREAKOUT_CONFIG.CANVAS_HEIGHT;

    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, width, height);

    // Game Over or Win text
    ctx.fillStyle = 'white';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';

    if (this.checkWin()) {
      ctx.fillStyle = '#4ECDC4';
      ctx.fillText('Level geschafft!', width / 2, height / 2 - 60);
    } else {
      ctx.fillText('Game Over', width / 2, height / 2 - 60);
    }

    // Score
    ctx.fillStyle = 'white';
    ctx.font = 'bold 28px Arial';
    ctx.fillText(`Punkte: ${this.score()}`, width / 2, height / 2 - 10);

    // New high score?
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
}
