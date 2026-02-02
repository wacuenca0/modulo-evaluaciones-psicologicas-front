import { Injectable, inject } from '@angular/core';
import { HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private auth = inject(AuthService);

  intercept(req: HttpRequest<any>, next: HttpHandler) {
    const url = req.url.toLowerCase();
    const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/refresh-token');
    if (isAuthEndpoint) {
      return next.handle(req);
    }

    const token = this.auth.getAccessToken();
    if (!token) return next.handle(req);
    const type = this.auth.getTokenType() || 'Bearer';
    const cloned = req.clone({ setHeaders: { Authorization: `${type} ${token}` } });
    return next.handle(cloned);
  }
}
