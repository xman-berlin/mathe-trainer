import { Routes } from '@angular/router';
import { CategoryHomeComponent } from './components/category-home/category-home';
import { LoginComponent } from './components/login/login.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  // Public routes (eager — first paint)
  { path: 'login', component: LoginComponent },

  // Protected home (eager — immediate post-login destination)
  { path: '', component: CategoryHomeComponent, canActivate: [authGuard] },

  // Global achievements
  {
    path: 'erfolge',
    loadComponent: () =>
      import('./components/global-achievements/global-achievements.component').then(
        (m) => m.GlobalAchievementsComponent
      ),
    canActivate: [authGuard],
  },

  // Mathe routes
  {
    path: 'mathe',
    loadComponent: () =>
      import('./components/category-overview/category-overview').then((m) => m.CategoryOverviewComponent),
    data: { category: 'math' },
    canActivate: [authGuard],
  },
  {
    path: 'mathe/uebung',
    loadComponent: () =>
      import('./components/exercise/exercise.component').then((m) => m.ExerciseComponent),
    data: { mode: 'practice' },
    canActivate: [authGuard],
  },
  {
    path: 'mathe/zeitrennen',
    loadComponent: () =>
      import('./components/exercise/exercise.component').then((m) => m.ExerciseComponent),
    data: { mode: 'timeTrial' },
    canActivate: [authGuard],
  },
  {
    path: 'mathe/sachaufgaben',
    loadComponent: () =>
      import('./components/word-problem-exercise/word-problem-exercise.component').then(
        (m) => m.WordProblemExerciseComponent
      ),
    data: { mode: 'practice' },
    canActivate: [authGuard],
  },
  { path: 'mathe/erfolge', redirectTo: '/erfolge?tab=math', pathMatch: 'full' },

  // Uhrzeit routes
  {
    path: 'uhrzeit',
    loadComponent: () =>
      import('./components/category-overview/category-overview').then((m) => m.CategoryOverviewComponent),
    data: { category: 'clock' },
    canActivate: [authGuard],
  },
  {
    path: 'uhrzeit/uebung',
    loadComponent: () =>
      import('./components/clock-exercise/clock-exercise').then((m) => m.ClockExerciseComponent),
    data: { mode: 'practice' },
    canActivate: [authGuard],
  },
  {
    path: 'uhrzeit/zeitrennen',
    loadComponent: () =>
      import('./components/clock-exercise/clock-exercise').then((m) => m.ClockExerciseComponent),
    data: { mode: 'timeTrial' },
    canActivate: [authGuard],
  },
  {
    path: 'uhrzeit/zeiger-setzen',
    loadComponent: () =>
      import('./components/set-clock-exercise/set-clock-exercise').then(
        (m) => m.SetClockExerciseComponent
      ),
    canActivate: [authGuard],
  },
  { path: 'uhrzeit/erfolge', redirectTo: '/erfolge?tab=clock', pathMatch: 'full' },

  // Game routes
  {
    path: 'spielen/flappy-fox',
    loadComponent: () =>
      import('./components/flappy-fox/flappy-fox').then((m) => m.FlappyFoxComponent),
    canActivate: [authGuard],
  },
  {
    path: 'spielen/dino-run',
    loadComponent: () =>
      import('./components/dino-run/dino-run').then((m) => m.DinoRunComponent),
    canActivate: [authGuard],
  },
  {
    path: 'spielen/breakout',
    loadComponent: () =>
      import('./components/breakout/breakout').then((m) => m.BreakoutComponent),
    canActivate: [authGuard],
  },
  {
    path: 'spielen/balloon-pop',
    loadComponent: () =>
      import('./components/balloon-pop/balloon-pop').then((m) => m.BalloonPopComponent),
    canActivate: [authGuard],
  },

  // Deutsch routes
  {
    path: 'deutsch',
    loadComponent: () =>
      import('./components/vocab-category-overview/vocab-category-overview').then(
        (m) => m.DeutschCategoryOverviewComponent
      ),
    canActivate: [authGuard],
  },
  {
    path: 'deutsch/rechtschreibung',
    loadComponent: () =>
      import('./components/vocab-exercise/vocab-exercise').then(
        (m) => m.DeutschRechtschreibungComponent
      ),
    canActivate: [authGuard],
  },
  {
    path: 'deutsch/hangman',
    loadComponent: () =>
      import('./components/hangman/hangman').then((m) => m.DeutschHangmanComponent),
    canActivate: [authGuard],
  },
  {
    path: 'deutsch/verwalten',
    loadComponent: () =>
      import('./components/vocab-management/vocab-management').then(
        (m) => m.VocabManagementComponent
      ),
    canActivate: [authGuard],
  },
  {
    path: 'deutsch/wochentage',
    loadComponent: () =>
      import('./components/sequence-exercise/sequence-exercise').then(
        (m) => m.SequenceExerciseComponent
      ),
    data: { type: 'weekdays' },
    canActivate: [authGuard],
  },
  {
    path: 'deutsch/monate',
    loadComponent: () =>
      import('./components/sequence-exercise/sequence-exercise').then(
        (m) => m.SequenceExerciseComponent
      ),
    data: { type: 'months' },
    canActivate: [authGuard],
  },
  {
    path: 'deutsch/alphabet',
    loadComponent: () =>
      import('./components/sequence-exercise/sequence-exercise').then(
        (m) => m.SequenceExerciseComponent
      ),
    data: { type: 'alphabet' },
    canActivate: [authGuard],
  },

  // Backward compatibility redirects
  { path: 'vokabeln', redirectTo: '/deutsch', pathMatch: 'full' },
  { path: 'vokabeln/uebung', redirectTo: '/deutsch/rechtschreibung', pathMatch: 'full' },
  { path: 'vokabeln/verwalten', redirectTo: '/deutsch/verwalten', pathMatch: 'full' },
  { path: 'uebung', redirectTo: 'mathe/uebung', pathMatch: 'full' },
  { path: 'zeitrennen', redirectTo: 'mathe/zeitrennen', pathMatch: 'full' },

  { path: '**', redirectTo: '/login' },
];
