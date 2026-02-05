import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PacienteAutocompleteComponent } from '../../shared/paciente-autocomplete.component';
import { PersonalMilitarDTO } from '../../models/personal-militar.models';
import { AtencionPsicologicaRequestDTO } from '../../models/atenciones-psicologicas.models';

@Component({
  selector: 'app-programar-atencion-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, PacienteAutocompleteComponent],
  templateUrl: './programar-atencion-modal.component.html',
  // styleUrls: ['./programar-atencion-modal.component.scss']
})
export class ProgramarAtencionModalComponent {
    get isCargandoAccion(): boolean {
      if (typeof this.cargandoAccion === 'function') {
        return !!this.cargandoAccion();
      }
      return !!this.cargandoAccion;
    }
  @Input() show = false;
  @Input() cargandoAccion: boolean | ReturnType<typeof signal> = false;
  @Input() error: string | null = null;
  @Input() mensajeExito: string | null = null;
  @Input() psicologoActual: { id: number | null, nombre: string } | null = null;
  @Input() tiposConsulta: any[] = [];
  @Input() tiposAtencion: any[] = [];
  @Input() pacienteSeleccionado: PersonalMilitarDTO | null = null;
  @Input() formModel!: AtencionPsicologicaRequestDTO;

  @Output() cancelar = new EventEmitter<void>();
  @Output() guardar = new EventEmitter<void>();
  @Output() asignarPaciente = new EventEmitter<PersonalMilitarDTO>();

  trackByValor(_index: number, item: any): any {
    return item.valor;
  }
}
