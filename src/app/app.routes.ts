import { Routes } from '@angular/router';
import { Layout } from './components/layout/layout';
import { Home } from './pages/home/home';
import { Devices } from './pages/devices/devices';
import { Users } from './pages/users/users';
import { AuthGuard } from './auth.guard';

export const routes: Routes = [
  {
    path: '',
    component: Layout,
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      {
        path: 'home',
        component: Home,
        canActivate: [AuthGuard],
        data: {},
      },
      {
        path: 'devices',
        component: Devices,
        canActivate: [AuthGuard],
        // data: {
        //   roles: ['device_manager', 'admin'],
        // },
      },
      {
        path: 'users',
        component: Users,
        canActivate: [AuthGuard],
        // data: {
        //   roles: ['admin'],
        // },
      },
    ],
  },
];
