import { ChangeDetectionStrategy, Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AtencionPsicologicaResponseDTO } from '../../models/atenciones-psicologicas.models';

@Component({
  selector: 'app-atenciones-lista',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './atenciones-lista.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AtencionesListaComponent {
  @Input() atenciones: AtencionPsicologicaResponseDTO[] = [];
  @Input() resaltarId: number | null = null;
  @Output() verDetalle = new EventEmitter<number>();
  @Output() editar = new EventEmitter<AtencionPsicologicaResponseDTO>();
  @Output() eliminar = new EventEmitter<number>();

  @Output() verHistorial = new EventEmitter<number>();

  @Output() finalizar = new EventEmitter<AtencionPsicologicaResponseDTO>();
  @Output() cancelar = new EventEmitter<AtencionPsicologicaResponseDTO>();
  @Output() noAsistio = new EventEmitter<AtencionPsicologicaResponseDTO>();
  @Output() reprogramar = new EventEmitter<AtencionPsicologicaResponseDTO>();
}
