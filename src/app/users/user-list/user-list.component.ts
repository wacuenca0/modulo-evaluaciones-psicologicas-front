import { ChangeDetectionStrategy, Component, inject, signal, computed, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { UserService } from '../../services/user.service';
import { UsersTabsComponent } from '../users-tabs.component';
import { UserDTO } from '../../models/auth.models';
import { FormsModule } from '@angular/forms';

type SortColumn = 'username' | 'email' | 'roleName' | 'active' | 'lastLogin';
type SortDirection = 'asc' | 'desc';

interface UserFilters {
  search: string;
  role: string;
  status: 'all' | 'active' | 'inactive';
}
@Component({
  selector: 'app-user-list',
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.scss'],
  imports: [CommonModule, RouterModule, FormsModule, UsersTabsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserListComponent implements OnInit {
    private readonly roleLabels: Record<string, string> = {
      'admin': 'Administrador',
      'administrador': 'Administrador',
      'psicologo': 'Psicólogo',
      'psicóloga': 'Psicólogo',
      'observador': 'Observador',
      'observadora': 'Observador',
      'user': 'Usuario',
      'usuario': 'Usuario',
      // Agrega más variantes si es necesario
    };

    getRoleLabel(role: string | null | undefined): string {
      if (!role) return '';
      const key = role.trim().toLowerCase();
      // Si el rol contiene "admin" lo muestra como Administrador
      if (key.includes('admin')) return 'Administrador';
      if (key.includes('psicolog')) return 'Psicólogo';
      if (key.includes('observador')) return 'Observador';
      if (key.includes('usuario') || key === 'user') return 'Usuario';
      return this.roleLabels[key] || role;
    }
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);

  readonly users = signal<UserDTO[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  // Filtros y ordenamiento
  readonly filters = signal<UserFilters>({
    search: '',
    role: 'all',
    status: 'all'
  });

  updateFilter<K extends keyof UserFilters>(key: K, value: UserFilters[K]) {
    this.filters.update(f => ({ ...f, [key]: value }));
  }

  readonly sortColumn = signal<SortColumn>('username');
  readonly sortDirection = signal<SortDirection>('asc');

  // Computed properties
  readonly filteredUsers = computed(() => {
    const allUsers = this.users();
    const { search, role, status } = this.filters();

    if (!search && role === 'all' && status === 'all') {
      return allUsers;
    }

    return allUsers.filter(user => {
      // Filtro de búsqueda
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesSearch =
          user.username?.toLowerCase().includes(searchLower) ||
          user.email?.toLowerCase().includes(searchLower) ||
          user.fullName?.toLowerCase().includes(searchLower) ||
          user.roleName?.toLowerCase().includes(searchLower);

        if (!matchesSearch) return false;
      }

      // Filtro de rol
      if (role !== 'all') {
        const userRoleLabel = this.getRoleLabel(user.roleName);
        if (userRoleLabel !== role) {
          return false;
        }
      }

      // Filtro de estado
      if (status !== 'all') {
        const isActive = user.active === true;
        if (status === 'active' && !isActive) return false;
        if (status === 'inactive' && isActive) return false;
      }
      return true;
    });
  });

  readonly sortedUsers = computed(() => {
    const users = [...this.filteredUsers()];
    const column = this.sortColumn();
    const direction = this.sortDirection();

    return users.sort((a, b) => {
      let valueA: any = a[column];
      let valueB: any = b[column];

      // Para ordenar estados activos
      if (column === 'active') {
        valueA = valueA ? 1 : 0;
        valueB = valueB ? 1 : 0;
      }

      // Para ordenar fechas
      if (column === 'lastLogin') {
        valueA = valueA ? new Date(valueA).getTime() : 0;
        valueB = valueB ? new Date(valueB).getTime() : 0;
      }

      // Convertir a string para ordenación
      if (typeof valueA === 'string') valueA = valueA.toLowerCase();
      if (typeof valueB === 'string') valueB = valueB.toLowerCase();

      // Valor por defecto para undefined/null
      if (valueA == null) valueA = '';
      if (valueB == null) valueB = '';

      let comparison = 0;
      if (valueA < valueB) comparison = -1;
      if (valueA > valueB) comparison = 1;

      return direction === 'asc' ? comparison : -comparison;
    });
  });

  readonly totalUsers = computed(() => this.users().length);
  readonly filteredCount = computed(() => this.filteredUsers().length);

  readonly availableRoles = computed(() => {
    const roles = new Set<string>();
    this.users().forEach(user => {
      if (user.roleName) {
        roles.add(this.getRoleLabel(user.roleName));
      }
    });
    // Aseguramos que el rol Observador siempre esté disponible en el filtro
    roles.add('Observador');
    return Array.from(roles).sort();
  });

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.loading.set(true);
    this.error.set(null);

    this.userService.list().subscribe({
      next: (users) => {
        this.users.set(users);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error cargando usuarios:', err);
        this.error.set('No se pudieron cargar los usuarios. Por favor, intenta nuevamente.');
        this.loading.set(false);
      }
    });
  }

  updateSort(column: SortColumn) {
    if (this.sortColumn() === column) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortColumn.set(column);
      this.sortDirection.set('asc');
    }
  }

  getSortIcon(column: SortColumn): string {
    if (this.sortColumn() !== column) {
      return 'M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9';
    }
    return this.sortDirection() === 'asc'
      ? 'M19.5 8.25l-7.5 7.5-7.5-7.5'
      : 'M4.5 15.75l7.5-7.5 7.5 7.5';
  }

  clearFilters() {
    this.filters.set({
      search: '',
      role: 'all',
      status: 'all'
    });
  }

  trackByUsername(index: number, user: UserDTO): string {
    return user.username;
  }

  goToPsicologoEdit(user: UserDTO) {
    // Preferir id numérico si existe, si no, intentar buscar por username
    if (user.id && user.id > 0) {
      this.router.navigate(['/users', user.id, 'edit-user']);
    } else if (user.username) {
      alert('El usuario no tiene un ID numérico válido.');
    } else {
      alert('No se puede identificar al usuario para editar.');
    }
  }
}