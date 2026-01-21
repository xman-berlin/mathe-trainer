import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'addition',
    loadComponent: () => import('./components/addition/addition.component').then(m => m.AdditionComponent)
  }
];
