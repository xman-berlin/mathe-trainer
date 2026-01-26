import { Routes } from '@angular/router';
import { ExerciseComponent } from './components/exercise/exercise.component';
import { HomeComponent } from './components/home/home.component';
import { AchievementsComponent } from './components/achievements/achievements.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'uebung', component: ExerciseComponent, data: { mode: 'practice' } },
  { path: 'zeitrennen', component: ExerciseComponent, data: { mode: 'timeTrial' } },
  { path: 'erfolge', component: AchievementsComponent },
  { path: '**', redirectTo: '' }
];
