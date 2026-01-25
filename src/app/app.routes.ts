import { Routes } from '@angular/router';
import { ExerciseComponent } from './components/exercise/exercise.component';
import { HomeComponent } from './components/home/home.component';
import { AchievementsComponent } from './components/achievements/achievements.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'rechnen', component: ExerciseComponent },
  { path: 'erfolge', component: AchievementsComponent },
  { path: '**', redirectTo: '' }
];
