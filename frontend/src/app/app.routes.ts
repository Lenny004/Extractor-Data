import { Routes } from '@angular/router';

import {
  requiereArchivoSubidoGuard,
  requiereColumnasDetectadasGuard,
} from './core/guards/extraction-flow.guards';

/**
 * Rutas principales de la SPA.
 *
 * Lazy loading:
 * - Cada string `loadComponent` genera un chunk separado en build, reduciendo el JS inicial.
 * - El Dashboard es el layout con `router-outlet` para montar apartados bajo demanda.
 */
export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.DashboardComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'subir' },
      {
        path: 'subir',
        loadComponent: () =>
          import('./features/upload-section/upload-section').then((m) => m.UploadSectionComponent),
      },
      {
        path: 'columnas',
        canActivate: [requiereArchivoSubidoGuard],
        loadComponent: () =>
          import('./features/column-selection-section/column-selection-section').then(
            (m) => m.ColumnSelectionSectionComponent,
          ),
      },
      {
        path: 'vista-previa',
        canActivate: [requiereColumnasDetectadasGuard],
        loadComponent: () =>
          import('./features/preview-workspace-section/preview-workspace-section').then(
            (m) => m.PreviewWorkspaceSectionComponent,
          ),
      },
      {
        path: 'espacio-trabajo',
        loadComponent: () =>
          import('./features/workspace-section/workspace-section').then(
            (m) => m.WorkspaceSectionComponent,
          ),
      },
      {
        path: 'generador-sql',
        loadComponent: () =>
          import('./features/sql-generator-section/sql-generator-section').then(
            (m) => m.SqlGeneratorSectionComponent,
          ),
      },
    ],
  },
];
