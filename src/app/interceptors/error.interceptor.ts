import { Injectable, inject } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  private isRefreshing = false;
  private readonly refreshTokenSubject: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((err: HttpErrorResponse) => {
        if (err.status === 401) {
          // attempt refresh flow
          return this.handle401Error(req, next);
        }
        return throwError(() => err);
      })
    );
  }

  private addTokenHeader(request: HttpRequest<any>, token: string | null): HttpRequest<any> {
    if (!token) return request;
    return request.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }

  private handle401Error(request: HttpRequest<any>, next: HttpHandler) {
    if (this.isRefreshing) {
      return this.refreshTokenSubject.pipe(
        filter(token => token != null),
        take(1),
        switchMap(token => next.handle(this.addTokenHeader(request, token)))
      );
    }

    this.isRefreshing = true;
    this.refreshTokenSubject.next(null);

    return this.auth.refreshToken().pipe(
      switchMap((res: any) => {
        this.isRefreshing = false;
        // res can be string (new access token) or RefreshTokenResponseDTO
        const newToken = typeof res === 'string' ? res : res?.accessToken;
        this.refreshTokenSubject.next(newToken || null);
        if (newToken) {
          return next.handle(this.addTokenHeader(request, newToken));
        }
        this.auth.clearAllTokens();
        this.router.navigate(['/login']).catch(() => {});
        return throwError(() => new Error('No token after refresh'));
      }),
      catchError((refreshErr: any) => {
        this.isRefreshing = false;
        this.auth.clearAllTokens();
        this.router.navigate(['/login']).catch(() => {});
        return throwError(() => refreshErr);
      })
    );
  }
}
