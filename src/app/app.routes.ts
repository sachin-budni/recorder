import { Routes } from '@angular/router';

export const routes: Routes = [
    { path: '', loadComponent: () => import('./recorder/recorder.component')
        .then(c => c.RecorderComponent) }
];
