import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  SeguimientoPsicologicoDTO,
  SeguimientoPsicologicoListParams,
  SeguimientoPsicologicoListResponse,
  SeguimientoPsicologicoPayload
} from '../models/seguimientos-psicologicos.models';

@Injectable({ providedIn: 'root' })
export class SeguimientosPsicologicosService {
  private readonly http = inject(HttpClient);
// File removed as per user request
// Archivo eliminado. Servicio removido.
}
