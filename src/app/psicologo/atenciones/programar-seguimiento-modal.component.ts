import { Component, Input, Output, EventEmitter, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PacienteAutocompleteComponent } from '../../shared/paciente-autocomplete.component';
import { PersonalMilitarDTO } from '../../models/personal-militar.models';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-programar-seguimiento-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, PacienteAutocompleteComponent],
  templateUrl: './programar-seguimiento-modal.component.html',
})
export class ProgramarSeguimientoModalComponent implements OnInit {
  @Input() show = false;
  @Input() cargandoAccion: boolean = false;
  @Input() error: string | null = null;
  @Input() mensajeExito: string | null = null;
  @Input() psicologoActual: { id: number | null, nombre: string } | null = null;
  @Input() diagnosticos: any[] = [];
  @Input() pacienteSeleccionado: PersonalMilitarDTO | null = null;
  @Input() formModel: any = {
    fichaPsicologicaId: null,
    personalMilitarId: null,
    psicologoId: null,
    fechaAtencion: '',
    horaInicio: '',
    horaFin: '',
    tipoAtencion: 'PRESENCIAL',
    tipoConsulta: 'SEGUIMIENTO',
    motivoConsulta: '',
    estado: 'PROGRAMADA'
  };

  @Output() cancelar = new EventEmitter<void>();
  @Output() guardar = new EventEmitter<void>();
  @Output() asignarPaciente = new EventEmitter<PersonalMilitarDTO>();

  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  // Diagnósticos seleccionados y filtrado (restaurado)
  searchTerm = '';
  diagnosticosFiltrados: any[] = [];

  ngOnInit() {
    this.actualizarDiagnosticosFiltrados();
  }

  actualizarDiagnosticosFiltrados() {
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      this.diagnosticosFiltrados = this.diagnosticos.filter(d =>
        d.codigo?.toLowerCase().includes(term) ||
        (d.nombre?.toLowerCase().includes(term) || d.descripcion?.toLowerCase().includes(term))
      ).slice(0, 10);
    } else {
      this.diagnosticosFiltrados = this.diagnosticos.slice(0, 10);
    }
  }

  toggleDiagnostico(id: number) {
    const currentIds = this.formModel.diagnosticoIds || [];
    const index = currentIds.indexOf(id);
    if (index > -1) {
      this.formModel.diagnosticoIds = currentIds.filter((i: number) => i !== id);
    } else {
      this.formModel.diagnosticoIds = [...currentIds, id];
    }
  }

  isDiagnosticoSeleccionado(id: number): boolean {
    return this.formModel.diagnosticoIds?.includes(id) || false;
  }

  getDiagnosticoById(id: number): any {
    return this.diagnosticos.find((d: any) => d.id === id);
  }

  // Lógica para trackBy si se agregan selects dinámicos
  trackByValor(_index: number, item: any): any {
    return item.valor;
  }

  // Enviar el seguimiento al backend y redirigir
  guardarSeguimiento() {
    console.log('FormModel al enviar:', this.formModel);
    console.log('Paciente seleccionado:', this.pacienteSeleccionado);
    console.log('Psicólogo actual:', this.psicologoActual);
    
    // VALIDACIONES CRÍTICAS
    if (!this.formModel.fichaPsicologicaId) {
      // Si no viene en formModel, intentamos obtenerlo de otras fuentes
      if (this.pacienteSeleccionado && 'fichaPsicologicaId' in this.pacienteSeleccionado) {
        this.formModel.fichaPsicologicaId = (this.pacienteSeleccionado as any).fichaPsicologicaId;
      } else if (this.formModel.fichaId) {
        this.formModel.fichaPsicologicaId = this.formModel.fichaId;
      }
    }
    
    // Validación final
    if (!this.formModel.fichaPsicologicaId) {
      this.error = 'No se ha definido la ficha psicológica. ID: ' + 
                   JSON.stringify({
                     formModelId: this.formModel.fichaPsicologicaId,
                     formModelFichaId: this.formModel.fichaId,
                     pacienteProps: this.pacienteSeleccionado ? Object.keys(this.pacienteSeleccionado) : 'no paciente'
                   });
      return;
    }
    
    if (!this.formModel.psicologoId) {
      this.formModel.psicologoId = this.psicologoActual?.id ?? null;
    }
    
    if (!this.formModel.personalMilitarId && this.pacienteSeleccionado) {
      this.formModel.personalMilitarId = this.pacienteSeleccionado.id;
    }
    
    if (!this.formModel.motivoConsulta) {
      this.error = 'El motivo de consulta es obligatorio.';
      return;
    }
    
    this.cargandoAccion = true;
    this.error = null;
    this.mensajeExito = null;
    
    // Construir payload EXACTO como espera el backend
    const payload = {
      fichaPsicologicaId: this.formModel.fichaPsicologicaId,
      psicologoId: this.formModel.psicologoId,
      fechaAtencion: this.formModel.fechaAtencion || new Date().toISOString().split('T')[0],
      horaInicio: this.formModel.horaInicio || '09:00',
      horaFin: this.formModel.horaFin || '10:00',
      motivoConsulta: this.formModel.motivoConsulta,
      // Campos opcionales pero recomendados
      tipoAtencion: this.formModel.tipoAtencion || 'PRESENCIAL',
      tipoConsulta: this.formModel.tipoConsulta || 'SEGUIMIENTO',
      estado: this.formModel.estado || 'PROGRAMADA'
    };
    
    console.log('Enviando payload:', payload);
    
    this.http.post('/api/atenciones/seguimiento', payload).subscribe({
      next: (response: any) => {
        console.log('Respuesta del servidor:', response);
        this.mensajeExito = 'Seguimiento programado correctamente';
        // Limpiar el formulario
        this.formModel.motivoConsulta = '';
        // Cerrar modal y redirigir resaltando la atención creada
        setTimeout(() => {
          this.cancelar.emit();
          // Redirigir a la página de atenciones y pasar el id de la nueva atención para resaltar
          const atencionId = response?.id || response?.atencionId || null;
          if (atencionId) {
            this.router.navigate(['/atenciones'], { queryParams: { resaltar: atencionId } });
          } else {
            this.router.navigate(['/atenciones']);
          }
        }, 1500);
      },
      error: (err) => {
        console.error('Error del servidor:', err);
        this.error = err?.error?.message || err?.message || 'Error al programar seguimiento';
        this.cargandoAccion = false;
      },
      complete: () => {
        this.cargandoAccion = false;
      }
    });
  }
}
