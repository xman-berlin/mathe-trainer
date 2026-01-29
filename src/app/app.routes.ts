import { Routes } from '@angular/router';
import { ExerciseComponent } from './components/exercise/exercise.component';
import { CategoryHomeComponent } from './components/category-home/category-home';
import { CategoryOverviewComponent } from './components/category-overview/category-overview';
import { AchievementsComponent } from './components/achievements/achievements.component';

export const routes: Routes = [
  { path: '', component: CategoryHomeComponent },
  { path: 'mathe', component: CategoryOverviewComponent, data: { category: 'math' } },
  { path: 'mathe/uebung', component: ExerciseComponent, data: { mode: 'practice' } },
  { path: 'mathe/zeitrennen', component: ExerciseComponent, data: { mode: 'timeTrial' } },
  { path: 'mathe/erfolge', component: AchievementsComponent },

  // Uhrzeit routes (placeholder for future)
  { path: 'uhrzeit', component: CategoryOverviewComponent, data: { category: 'clock' } },

  // Redirects for backward compatibility
  { path: 'uebung', redirectTo: 'mathe/uebung', pathMatch: 'full' },
  { path: 'zeitrennen', redirectTo: 'mathe/zeitrennen', pathMatch: 'full' },
  { path: 'erfolge', redirectTo: 'mathe/erfolge', pathMatch: 'full' },

  { path: '**', redirectTo: '' }
];
