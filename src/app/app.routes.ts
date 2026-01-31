import { Routes } from '@angular/router';
import { ExerciseComponent } from './components/exercise/exercise.component';
import { CategoryHomeComponent } from './components/category-home/category-home';
import { CategoryOverviewComponent } from './components/category-overview/category-overview';
import { AchievementsComponent } from './components/achievements/achievements.component';
import { ClockExerciseComponent } from './components/clock-exercise/clock-exercise';
import { LoginComponent } from './components/login/login.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  // Public routes
  { path: 'login', component: LoginComponent },

  // Protected routes (require authentication)
  { path: '', component: CategoryHomeComponent, canActivate: [authGuard] },

  // Mathe routes
  { path: 'mathe', component: CategoryOverviewComponent, data: { category: 'math' }, canActivate: [authGuard] },
  { path: 'mathe/uebung', component: ExerciseComponent, data: { mode: 'practice' }, canActivate: [authGuard] },
  { path: 'mathe/zeitrennen', component: ExerciseComponent, data: { mode: 'timeTrial' }, canActivate: [authGuard] },
  { path: 'mathe/erfolge', component: AchievementsComponent, canActivate: [authGuard] },

  // Uhrzeit routes
  { path: 'uhrzeit', component: CategoryOverviewComponent, data: { category: 'clock' }, canActivate: [authGuard] },
  { path: 'uhrzeit/uebung', component: ClockExerciseComponent, data: { mode: 'practice' }, canActivate: [authGuard] },
  { path: 'uhrzeit/zeitrennen', component: ClockExerciseComponent, data: { mode: 'timeTrial' }, canActivate: [authGuard] },
  { path: 'uhrzeit/erfolge', component: AchievementsComponent, data: { category: 'clock' }, canActivate: [authGuard] },

  // Redirects for backward compatibility
  { path: 'uebung', redirectTo: 'mathe/uebung', pathMatch: 'full' },
  { path: 'zeitrennen', redirectTo: 'mathe/zeitrennen', pathMatch: 'full' },
  { path: 'erfolge', redirectTo: 'mathe/erfolge', pathMatch: 'full' },

  { path: '**', redirectTo: '/login' }
];
