import { TestBed } from '@angular/core/testing';
import { LoginComponent } from './login.component';
import { AuthService } from '../services/auth.service';
import { of } from 'rxjs';
import { Router } from '@angular/router';

class MockAuthService {
  login() { return of({ accessToken: 't', refreshToken: 'r', tokenType: 'Bearer', expiresIn: 3600, user: { id: 1, username: 'u', roles: ['USER'], enabled: true } }); }
}
class MockRouter { navigate(_args: any[]) { /* no-op */ } }

describe('LoginComponent', () => {
  beforeEach(() => {
    localStorage.removeItem('remembered_username');
    TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        { provide: AuthService, useClass: MockAuthService },
        { provide: Router, useClass: MockRouter }
      ]
    });
  });

  it('carga username recordado si existe', () => {
    localStorage.setItem('remembered_username', 'memoUser');
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance;
    expect(comp.form.get('username')?.value).toBe('memoUser');
    expect(comp.form.get('remember')?.value).toBeTrue();
  });

  it('no llama login si form inválido', () => {
    const auth = TestBed.inject(AuthService);
    spyOn(auth, 'login').and.callThrough();
    const fixture = TestBed.createComponent(LoginComponent);
    const comp = fixture.componentInstance;
    comp.form.patchValue({ username: '', password: '' });
    comp.submit();
    expect(auth.login).not.toHaveBeenCalled();
  });

  it('llama login si form válido', () => {
    const auth = TestBed.inject(AuthService);
    spyOn(auth, 'login').and.callThrough();
    const fixture = TestBed.createComponent(LoginComponent);
    const comp = fixture.componentInstance;
    comp.form.patchValue({ username: 'user', password: 'pass', remember: true });
    comp.submit();
    expect(auth.login).toHaveBeenCalled();
    expect(localStorage.getItem('remembered_username')).toBe('user');
  });
});
