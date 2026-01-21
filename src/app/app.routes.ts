import { Routes } from '@angular/router';
import { AdditionComponent } from './components/addition/addition.component';
import { SubtractionComponent } from './components/subtraction/subtraction.component';
import { HomeComponent } from './components/home/home.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'addition', component: AdditionComponent },
  { path: 'subtraction', component: SubtractionComponent },
  { path: '**', redirectTo: '' }
];
