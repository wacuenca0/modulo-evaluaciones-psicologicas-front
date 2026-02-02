import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormGroup, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { UserService } from '../../services/user.service';
import { UsersTabsComponent } from '../users-tabs.component';

@Component({
  selector: 'app-change-password',
  templateUrl: './change-password.component.html',
  imports: [CommonModule, ReactiveFormsModule, UsersTabsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChangePasswordComponent {
    irAUsuarios() {
      this.router.navigate(['/users']);
    }
  private readonly fb = inject(FormBuilder);
  private readonly userService = inject(UserService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly username = this.route.snapshot.paramMap.get('id');

  form: FormGroup = this.fb.group({
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  submit() {
    const username = this.username;
    if (this.form.invalid || !username) return;
    this.loading.set(true);
    const { password } = this.form.getRawValue() as { password: string };
    this.userService.changePassword({ username, password }).subscribe({
      next: () => { this.loading.set(false); this.router.navigate(['/users']); },
      error: (err) => { this.loading.set(false); this.error.set(err?.error?.message || 'Error al cambiar contraseña'); }
    });
  }
}
