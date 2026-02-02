import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpResponse } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    try {
      const safeHeaders: Record<string,string> = {};
      req.headers.keys().forEach(k => {
        const v = req.headers.get(k) || '';
        if (k.toLowerCase() === 'authorization') {
          // mask token for safety
          safeHeaders[k] = v.length > 20 ? v.slice(0, 10) + '...' + v.slice(-10) : v;
        } else {
          safeHeaders[k] = v;
        }
      });
      console.log('[HTTP] →', req.method, req.urlWithParams, { headers: safeHeaders, body: req.body });
    } catch (e) {
      console.log('[HTTP] →', req.method, req.urlWithParams);
    }

    return next.handle(req).pipe(
      tap(event => {
        if (event instanceof HttpResponse) {
          console.log('[HTTP] ←', req.method, req.urlWithParams, event.status, event.body);
        }
      })
    );
  }
}
