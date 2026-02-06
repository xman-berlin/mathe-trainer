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
import { DINO_RUN_CONFIG, GameState } from '../../models/game.model';

interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'cactus' | 'bird';
  passed: boolean;
}

@Component({
  standalone: true,
  selector: 'app-dino-run',
  imports: [RouterLink],
  templateUrl: './dino-run.html',
  styleUrl: './dino-run.css',
})
export class DinoRunComponent implements OnInit, OnDestroy, AfterViewInit {
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
  readonly canAfford = computed(() => this.coinsService.canAfford(DINO_RUN_CONFIG.COST_TO_PLAY));
  readonly coinBalance = this.coinsService.balance;

  // Config
  readonly config = DINO_RUN_CONFIG;

  // Canvas context
  private ctx: CanvasRenderingContext2D | null = null;
  private animationFrameId: number | null = null;

  // Game objects
  private playerY = DINO_RUN_CONFIG.GROUND_Y;
  private playerVelocity = 0;
  private isJumping = false;
  private obstacles: Obstacle[] = [];
  private spawnTimer = 0;
  private nextSpawnInterval = 100;

  // Dynamic difficulty
  private currentSpeed = DINO_RUN_CONFIG.INITIAL_SPEED;
  private distanceTraveled = 0;

  // Ground animation
  private groundOffset = 0;

  ngOnInit(): void {
    const userId = this.authService.currentUser()?.id;
    if (userId) {
      this.highScore.set(this.gameService.getHighScore(DINO_RUN_CONFIG.GAME_ID));
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
    canvas.width = DINO_RUN_CONFIG.CANVAS_WIDTH;
    canvas.height = DINO_RUN_CONFIG.CANVAS_HEIGHT;
    this.ctx = canvas.getContext('2d');
  }

  // ============================================================================
  // INPUT HANDLERS
  // ============================================================================

  @HostListener('window:keydown', ['$event'])
  handleKeydown(event: KeyboardEvent): void {
    if (event.code === 'Space' || event.key === ' ' || event.code === 'ArrowUp') {
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
      this.jump();
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

    const success = await this.gameService.startGame(userId, DINO_RUN_CONFIG.GAME_ID);
    if (!success) {
      return;
    }

    // Reset game state
    this.playerY = DINO_RUN_CONFIG.GROUND_Y;
    this.playerVelocity = 0;
    this.isJumping = false;
    this.obstacles = [];
    this.spawnTimer = 0;
    this.nextSpawnInterval = 100;
    this.currentSpeed = DINO_RUN_CONFIG.INITIAL_SPEED;
    this.distanceTraveled = 0;
    this.groundOffset = 0;

    this.score.set(0);
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

  private jump(): void {
    if (!this.isJumping) {
      this.playerVelocity = DINO_RUN_CONFIG.JUMP_VELOCITY;
      this.isJumping = true;
    }
  }

  private async endGame(): Promise<void> {
    this.gameState.set('GAME_OVER');
    this.stopGameLoop();

    const userId = this.authService.currentUser()?.id;
    if (userId) {
      const isNewHighScore = await this.gameService.saveScore(
        userId,
        DINO_RUN_CONFIG.GAME_ID,
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

    // Update ground offset for scrolling effect
    this.groundOffset = (this.groundOffset + this.currentSpeed) % 40;

    // Update distance and score
    this.distanceTraveled += this.currentSpeed;
    this.score.set(Math.floor(this.distanceTraveled / 10));

    // Increase speed over time
    if (this.currentSpeed < DINO_RUN_CONFIG.MAX_SPEED) {
      this.currentSpeed += DINO_RUN_CONFIG.SPEED_INCREMENT;
    }

    // Apply gravity
    if (this.isJumping) {
      this.playerVelocity += DINO_RUN_CONFIG.GRAVITY;
      this.playerY += this.playerVelocity;

      // Check if landed
      if (this.playerY >= DINO_RUN_CONFIG.GROUND_Y) {
        this.playerY = DINO_RUN_CONFIG.GROUND_Y;
        this.playerVelocity = 0;
        this.isJumping = false;
      }
    }

    // Spawn obstacles
    this.spawnTimer++;
    if (this.spawnTimer >= this.nextSpawnInterval) {
      this.spawnObstacle();
      this.spawnTimer = 0;
      // Random interval for next spawn
      const { SPAWN_INTERVAL_MIN, SPAWN_INTERVAL_MAX } = DINO_RUN_CONFIG;
      this.nextSpawnInterval = Math.floor(
        Math.random() * (SPAWN_INTERVAL_MAX - SPAWN_INTERVAL_MIN) + SPAWN_INTERVAL_MIN
      );
    }

    // Update obstacles
    for (const obstacle of this.obstacles) {
      obstacle.x -= this.currentSpeed;

      // Check if passed
      if (!obstacle.passed && obstacle.x + obstacle.width < DINO_RUN_CONFIG.PLAYER_X) {
        obstacle.passed = true;
      }

      // Check collision
      if (this.checkCollision(obstacle)) {
        this.endGame();
        return;
      }
    }

    // Remove off-screen obstacles
    this.obstacles = this.obstacles.filter((o) => o.x + o.width > 0);
  }

  private spawnObstacle(): void {
    const isBird = Math.random() > 0.7 && this.score() > 50; // Birds only after score 50

    if (isBird) {
      const isHigh = Math.random() > 0.5;
      this.obstacles.push({
        x: DINO_RUN_CONFIG.CANVAS_WIDTH,
        y: isHigh ? DINO_RUN_CONFIG.BIRD_HEIGHT_HIGH : DINO_RUN_CONFIG.BIRD_HEIGHT_LOW,
        width: DINO_RUN_CONFIG.BIRD_SIZE,
        height: DINO_RUN_CONFIG.BIRD_SIZE,
        type: 'bird',
        passed: false,
      });
    } else {
      const height =
        Math.random() * (DINO_RUN_CONFIG.OBSTACLE_MAX_HEIGHT - DINO_RUN_CONFIG.OBSTACLE_MIN_HEIGHT) +
        DINO_RUN_CONFIG.OBSTACLE_MIN_HEIGHT;
      this.obstacles.push({
        x: DINO_RUN_CONFIG.CANVAS_WIDTH,
        y: DINO_RUN_CONFIG.GROUND_Y + DINO_RUN_CONFIG.PLAYER_SIZE - height,
        width: DINO_RUN_CONFIG.OBSTACLE_WIDTH,
        height: height,
        type: 'cactus',
        passed: false,
      });
    }
  }

  private checkCollision(obstacle: Obstacle): boolean {
    const playerX = DINO_RUN_CONFIG.PLAYER_X;
    const playerSize = DINO_RUN_CONFIG.PLAYER_SIZE;

    // Shrink hitbox slightly for fairness
    const margin = 8;
    const playerLeft = playerX + margin;
    const playerRight = playerX + playerSize - margin;
    const playerTop = this.playerY + margin;
    const playerBottom = this.playerY + playerSize - margin;

    const obstacleLeft = obstacle.x + 5;
    const obstacleRight = obstacle.x + obstacle.width - 5;
    const obstacleTop = obstacle.y + 5;
    const obstacleBottom = obstacle.y + obstacle.height - 5;

    return (
      playerRight > obstacleLeft &&
      playerLeft < obstacleRight &&
      playerBottom > obstacleTop &&
      playerTop < obstacleBottom
    );
  }

  // ============================================================================
  // RENDERING
  // ============================================================================

  private draw(): void {
    if (!this.ctx) return;

    const ctx = this.ctx;
    const width = DINO_RUN_CONFIG.CANVAS_WIDTH;
    const height = DINO_RUN_CONFIG.CANVAS_HEIGHT;

    // Sky gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(1, '#E0F6FF');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Draw clouds (simple decorative)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    this.drawCloud(ctx, 100, 50, 40);
    this.drawCloud(ctx, 300, 80, 30);
    this.drawCloud(ctx, 500, 40, 35);

    // Draw ground
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(0, DINO_RUN_CONFIG.GROUND_Y + DINO_RUN_CONFIG.PLAYER_SIZE, width, 50);

    // Draw ground pattern (scrolling)
    ctx.fillStyle = '#654321';
    for (let x = -this.groundOffset; x < width; x += 40) {
      ctx.fillRect(x, DINO_RUN_CONFIG.GROUND_Y + DINO_RUN_CONFIG.PLAYER_SIZE, 20, 5);
    }

    // Draw obstacles
    for (const obstacle of this.obstacles) {
      this.drawObstacle(ctx, obstacle);
    }

    // Draw player
    this.drawPlayer(ctx);

    // Draw score
    ctx.fillStyle = '#333';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(`${this.score()}`, width - 20, 35);

    // Draw high score
    ctx.fillStyle = '#666';
    ctx.font = '16px Arial';
    ctx.fillText(`HI: ${this.highScore()}`, width - 20, 55);
  }

  private drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.arc(x + size * 0.8, y - size * 0.2, size * 0.7, 0, Math.PI * 2);
    ctx.arc(x + size * 1.5, y, size * 0.8, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawPlayer(ctx: CanvasRenderingContext2D): void {
    const x = DINO_RUN_CONFIG.PLAYER_X;
    const y = this.playerY;
    const size = DINO_RUN_CONFIG.PLAYER_SIZE;

    // Draw fox emoji
    ctx.font = `${size}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🦊', x + size / 2, y + size / 2);
  }

  private drawObstacle(ctx: CanvasRenderingContext2D, obstacle: Obstacle): void {
    ctx.font = `${obstacle.height}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (obstacle.type === 'cactus') {
      ctx.fillText('🌵', obstacle.x + obstacle.width / 2, obstacle.y + obstacle.height / 2);
    } else {
      ctx.fillText('🦅', obstacle.x + obstacle.width / 2, obstacle.y + obstacle.height / 2);
    }
  }

  private drawReadyScreen(): void {
    if (!this.ctx) return;

    const ctx = this.ctx;
    const width = DINO_RUN_CONFIG.CANVAS_WIDTH;
    const height = DINO_RUN_CONFIG.CANVAS_HEIGHT;

    // Background
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(1, '#E0F6FF');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Ground
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(0, DINO_RUN_CONFIG.GROUND_Y + DINO_RUN_CONFIG.PLAYER_SIZE, width, 50);

    // Fox
    ctx.font = '60px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🦊', width / 2, height / 2 - 30);

    // Title
    ctx.fillStyle = '#333';
    ctx.font = 'bold 32px Arial';
    ctx.fillText('Dino Run', width / 2, 50);

    // Instructions
    ctx.fillStyle = '#666';
    ctx.font = '18px Arial';
    ctx.fillText('Space oder tippe zum Springen', width / 2, height / 2 + 40);

    // High score
    if (this.highScore() > 0) {
      ctx.fillText(`Highscore: ${this.highScore()}`, width / 2, height / 2 + 70);
    }
  }

  private drawGameOverScreen(): void {
    if (!this.ctx) return;

    const ctx = this.ctx;
    const width = DINO_RUN_CONFIG.CANVAS_WIDTH;
    const height = DINO_RUN_CONFIG.CANVAS_HEIGHT;

    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, width, height);

    // Game Over text
    ctx.fillStyle = 'white';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Game Over', width / 2, height / 2 - 50);

    // Score
    ctx.font = 'bold 28px Arial';
    ctx.fillText(`Punkte: ${this.score()}`, width / 2, height / 2);

    // New high score?
    if (this.isNewHighScore()) {
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 20px Arial';
      ctx.fillText('Neuer Highscore! 🎉', width / 2, height / 2 + 40);
    } else {
      ctx.fillStyle = 'white';
      ctx.font = '18px Arial';
      ctx.fillText(`Highscore: ${this.highScore()}`, width / 2, height / 2 + 40);
    }
  }
}
