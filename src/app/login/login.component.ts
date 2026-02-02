import { ChangeDetectionStrategy, Component, PLATFORM_ID, inject, signal, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { LoginRequestDTO, LoginResponseDTO } from '../models/auth.models';
import { PasswordChangeService } from '../services/password-change.service';

const REMEMBER_KEY = 'remembered_username';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
})

export class LoginComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly passwordChange = inject(PasswordChangeService);

  readonly loading = signal(false);
  readonly showPassword = signal(false);
  readonly error = signal<string | null>(null);
  readonly showPasswordRequest = signal(false);
  readonly passwordRequestSuccess = signal<string | null>(null);
  passwordRequestForm: FormGroup = this.fb.group({
    username: ['', Validators.required],
    motivo: ['Olvidé mi contraseña', Validators.required]
  });
  form: FormGroup = this.fb.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
    remember: [false]
  });

  ngOnInit(): void {
    const storage = this.getLocalStorage();
    if (!storage) return;
    const saved = storage.getItem(REMEMBER_KEY);
    if (saved) this.form.patchValue({ username: saved, remember: true });
  }

  togglePassword() { this.showPassword.update(v => !v); }

  submit() {
    if (this.form.invalid || this.loading()) return;
    this.loading.set(true);
    const dto: LoginRequestDTO = this.form.value as LoginRequestDTO;
    this.auth.login(dto).subscribe({
      next: (res: LoginResponseDTO) => {
        this.loading.set(false);
        this.error.set(null);
        // Persistencia de usuario recordado
        const storage = this.getLocalStorage();
        if (storage) {
          if (this.form.get('remember')?.value) {
            storage.setItem(REMEMBER_KEY, this.form.get('username')?.value || '');
          } else {
            storage.removeItem(REMEMBER_KEY);
          }
        }
        // Navigate always to dashboard on success
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading.set(false);
        this.auth.clearAllTokens();
        if (err?.status === 403) this.error.set('Acceso denegado.');
        else if (err?.status === 401) this.error.set('Credenciales inválidas.');
        else if (err?.status === 423) {
          // 423 Locked: usuario bloqueado por cambio pendiente
          this.error.set('Su cuenta tiene una solicitud de cambio de contraseña pendiente. Espere a que el administrador la apruebe.');
        }
        else this.error.set(err?.error?.message || 'No se pudo iniciar sesión.');
      }
    });
  }

  openPasswordRequest() {
    this.passwordRequestForm.patchValue({ username: this.form.get('username')?.value || '' });
    this.showPasswordRequest.set(true);
    this.passwordRequestSuccess.set(null);
    this.error.set(null);
  }

  closePasswordRequest() {
    this.showPasswordRequest.set(false);
    this.passwordRequestForm.reset({ motivo: 'Olvidé mi contraseña' });
    this.passwordRequestSuccess.set(null);
  }

  closePasswordRequestSuccess() {
    this.passwordRequestSuccess.set(null);
    this.error.set(null);
  }

  submitPasswordRequest() {
    if (this.passwordRequestForm.invalid) return;
    this.loading.set(true);
    const { username, motivo } = this.passwordRequestForm.value;
    this.passwordChange.requestChange(username, motivo).subscribe({
      next: () => {
        this.loading.set(false);
        this.passwordRequestSuccess.set('Solicitud enviada correctamente. Espere a que el administrador la apruebe.');
        this.showPasswordRequest.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.passwordRequestSuccess.set(null);
        this.error.set(err?.error?.message || 'No se pudo enviar la solicitud.');
      }
    });
  }

  private getLocalStorage(): Storage | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    try {
      return globalThis.localStorage;
    } catch {
      return null;
    }
  }
}
