import { Routes } from '@angular/router';
import { ExerciseComponent } from './components/exercise/exercise.component';
import { CategoryHomeComponent } from './components/category-home/category-home';
import { CategoryOverviewComponent } from './components/category-overview/category-overview';
import { GlobalAchievementsComponent } from './components/global-achievements/global-achievements.component';
import { ClockExerciseComponent } from './components/clock-exercise/clock-exercise';
import { SetClockExerciseComponent } from './components/set-clock-exercise/set-clock-exercise';
import { WordProblemExerciseComponent } from './components/word-problem-exercise/word-problem-exercise.component';
import { FlappyFoxComponent } from './components/flappy-fox/flappy-fox';
import { DinoRunComponent } from './components/dino-run/dino-run';
import { BreakoutComponent } from './components/breakout/breakout';
import { BalloonPopComponent } from './components/balloon-pop/balloon-pop';
import { LoginComponent } from './components/login/login.component';
import { DeutschCategoryOverviewComponent } from './components/vocab-category-overview/vocab-category-overview';
import { DeutschRechtschreibungComponent } from './components/vocab-exercise/vocab-exercise';
import { VocabManagementComponent } from './components/vocab-management/vocab-management';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  // Public routes
  { path: 'login', component: LoginComponent },

  // Protected routes (require authentication)
  { path: '', component: CategoryHomeComponent, canActivate: [authGuard] },

  // Global achievements (new unified page)
  { path: 'erfolge', component: GlobalAchievementsComponent, canActivate: [authGuard] },

  // Mathe routes
  { path: 'mathe', component: CategoryOverviewComponent, data: { category: 'math' }, canActivate: [authGuard] },
  { path: 'mathe/uebung', component: ExerciseComponent, data: { mode: 'practice' }, canActivate: [authGuard] },
  { path: 'mathe/zeitrennen', component: ExerciseComponent, data: { mode: 'timeTrial' }, canActivate: [authGuard] },
  { path: 'mathe/sachaufgaben', component: WordProblemExerciseComponent, data: { mode: 'practice' }, canActivate: [authGuard] },
  { path: 'mathe/erfolge', redirectTo: '/erfolge?tab=math', pathMatch: 'full' },

  // Uhrzeit routes
  { path: 'uhrzeit', component: CategoryOverviewComponent, data: { category: 'clock' }, canActivate: [authGuard] },
  { path: 'uhrzeit/uebung', component: ClockExerciseComponent, data: { mode: 'practice' }, canActivate: [authGuard] },
  { path: 'uhrzeit/zeitrennen', component: ClockExerciseComponent, data: { mode: 'timeTrial' }, canActivate: [authGuard] },
  { path: 'uhrzeit/zeiger-setzen', component: SetClockExerciseComponent, canActivate: [authGuard] },
  { path: 'uhrzeit/erfolge', redirectTo: '/erfolge?tab=clock', pathMatch: 'full' },

  // Game routes
  { path: 'spielen/flappy-fox', component: FlappyFoxComponent, canActivate: [authGuard] },
  { path: 'spielen/dino-run', component: DinoRunComponent, canActivate: [authGuard] },
  { path: 'spielen/breakout', component: BreakoutComponent, canActivate: [authGuard] },
  { path: 'spielen/balloon-pop', component: BalloonPopComponent, canActivate: [authGuard] },

  // Deutsch routes
  { path: 'deutsch', component: DeutschCategoryOverviewComponent, canActivate: [authGuard] },
  { path: 'deutsch/rechtschreibung', component: DeutschRechtschreibungComponent, canActivate: [authGuard] },
  { path: 'deutsch/verwalten', component: VocabManagementComponent, canActivate: [authGuard] },
  // Backward compatibility redirects
  { path: 'vokabeln', redirectTo: '/deutsch', pathMatch: 'full' },
  { path: 'vokabeln/uebung', redirectTo: '/deutsch/rechtschreibung', pathMatch: 'full' },
  { path: 'vokabeln/verwalten', redirectTo: '/deutsch/verwalten', pathMatch: 'full' },

  // Redirects for backward compatibility
  { path: 'uebung', redirectTo: 'mathe/uebung', pathMatch: 'full' },
  { path: 'zeitrennen', redirectTo: 'mathe/zeitrennen', pathMatch: 'full' },

  { path: '**', redirectTo: '/login' }
];
