import {
  Directive,
  ElementRef,
  ViewChild,
  signal,
  computed,
  inject,
  OnInit,
  OnDestroy,
  AfterViewInit,
} from '@angular/core';
import { Router } from '@angular/router';
import { GameService } from '../../services/game.service';
import { CoinsService } from '../../services/coins.service';
import { AuthService } from '../../services/auth.service';
import { GameState } from '../../models/game.model';

/**
 * BaseGameComponent
 *
 * Abstract base for all canvas-based mini-games (balloon-pop, breakout,
 * dino-run, flappy-fox). Extracts ~200 lines of identical boilerplate per game:
 * - Common signals (gameState, score, highScore, isNewHighScore, coinBalance)
 * - Canvas and animation-frame management (initCanvas, startGameLoop, stopGameLoop)
 * - Lifecycle hooks (ngOnInit, ngAfterViewInit, ngOnDestroy)
 * - endGame() flow (save score, update highScore, drawGameOverScreen)
 * - goBack() navigation
 *
 * Subclasses MUST implement:
 * - update(): void  — game logic, called every frame
 * - draw(): void    — rendering, called every frame
 * - drawReadyScreen(): void   — initial "press to start" screen
 * - drawGameOverScreen(): void — game-over overlay
 * - startGame(): Promise<void> — game-specific state reset + calls startGameLoop()
 *
 * Subclasses MAY override:
 * - readonly GAME_CONFIG — to provide the game config object (used by default endGame)
 */
@Directive()
export abstract class BaseGameComponent<TState extends string = GameState>
  implements OnInit, OnDestroy, AfterViewInit
{
  @ViewChild('gameCanvas', { static: true })
  protected canvasRef!: ElementRef<HTMLCanvasElement>;

  // --- Services (protected so subclasses can access them) ---
  protected readonly gameService = inject(GameService);
  protected readonly coinsService = inject(CoinsService);
  protected readonly authService = inject(AuthService);
  protected readonly router = inject(Router);

  // --- Common signals ---
  readonly gameState = signal<TState>('READY' as TState);
  readonly score = signal(0);
  readonly highScore = signal(0);
  readonly isNewHighScore = signal(false);
  readonly coinBalance = this.coinsService.balance;

  // Override in subclass to configure the "can afford" check
  readonly canAfford = computed(() => false);

  // --- Canvas internals ---
  protected ctx: CanvasRenderingContext2D | null = null;
  private animationFrameId: number | null = null;

  // --- Abstract interface ---

  /** The game config object; must provide GAME_ID, CANVAS_WIDTH, CANVAS_HEIGHT, COST_TO_PLAY. */
  protected abstract readonly config: {
    GAME_ID: string;
    CANVAS_WIDTH: number;
    CANVAS_HEIGHT: number;
    COST_TO_PLAY: number;
  };

  /** Game-specific per-frame physics/logic. */
  protected abstract update(): void;

  /** Game-specific per-frame rendering. */
  protected abstract draw(): void;

  /** Screen shown before the game starts. */
  protected abstract drawReadyScreen(): void;

  /** Overlay shown after game over. */
  protected abstract drawGameOverScreen(): void;

  /** Game-specific state reset. Must call startGameLoop() when ready. */
  abstract startGame(): Promise<void>;

  // --- Lifecycle ---

  ngOnInit(): void {
    const userId = this.authService.currentUser()?.id;
    if (userId) {
      this.highScore.set(this.gameService.getHighScore(this.config.GAME_ID));
    }
  }

  ngAfterViewInit(): void {
    this.initCanvas();
    this.drawReadyScreen();
  }

  ngOnDestroy(): void {
    this.stopGameLoop();
  }

  // --- Canvas management ---

  protected initCanvas(): void {
    const canvas = this.canvasRef.nativeElement;
    canvas.width = this.config.CANVAS_WIDTH;
    canvas.height = this.config.CANVAS_HEIGHT;
    this.ctx = canvas.getContext('2d');
  }

  protected startGameLoop(): void {
    const gameLoop = () => {
      this.update();
      this.draw();
      this.animationFrameId = requestAnimationFrame(gameLoop);
    };
    this.animationFrameId = requestAnimationFrame(gameLoop);
  }

  protected stopGameLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  // --- Common game control ---

  /** Saves score, updates highScore signal, calls drawGameOverScreen(). */
  protected async endGame(): Promise<void> {
    this.gameState.set('GAME_OVER' as TState);
    this.stopGameLoop();

    const userId = this.authService.currentUser()?.id;
    if (userId) {
      const isNew = await this.gameService.saveScore(
        userId,
        this.config.GAME_ID,
        this.score()
      );
      this.isNewHighScore.set(isNew);
      if (isNew) {
        this.highScore.set(this.score());
      }
    }

    this.drawGameOverScreen();
  }

  async restartGame(): Promise<void> {
    await this.startGame();
  }

  goBack(): void {
    this.router.navigate(['/erfolge'], { queryParams: { tab: 'games' } });
  }
}
