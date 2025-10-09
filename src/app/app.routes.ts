import { Routes } from '@angular/router';
import { Layout } from './components/layout/layout';
import { Home } from './pages/home/home';
import { Devices } from './pages/devices/devices';
import { Users } from './pages/users/users';

export const routes: Routes = [
  {
    path: '',
    component: Layout,
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      { path: 'home', component: Home },
      { path: 'devices', component: Devices },
      { path: 'users', component: Users },
    ],
  },
];
