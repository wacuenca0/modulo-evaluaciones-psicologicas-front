import { Component, EventEmitter, Output, input, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-finalizar-atencion-modal',
  templateUrl: './finalizar-atencion-modal.component.html',
  styleUrls: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule]
})
export class FinalizarAtencionModalComponent {
  open = input(false);
  anamnesis = signal('');
  examenMental = signal('');
  impresionDiagnostica = signal('');
  planIntervencion = signal('');
  recomendaciones = signal('');
  derivacion = signal('');
  diagnosticoIds = signal<string>(''); // IDs separados por coma

  @Output() closed = new EventEmitter<void>();
  @Output() finalizar = new EventEmitter<any>();

  onClose() {
    this.closed.emit();
  }

  onFinalizar() {
    // Validar todos los campos
    if (!this.anamnesis() || !this.examenMental() || !this.impresionDiagnostica() || !this.planIntervencion() || !this.recomendaciones() || !this.derivacion() || !this.diagnosticoIds()) {
      alert('Todos los campos son obligatorios.');
      return;
    }
    const diagnosticoIdsArr = this.diagnosticoIds().split(',').map(id => Number(id.trim())).filter(id => !!id);
    this.finalizar.emit({
      anamnesis: this.anamnesis(),
      examenMental: this.examenMental(),
      impresionDiagnostica: this.impresionDiagnostica(),
      planIntervencion: this.planIntervencion(),
      recomendaciones: this.recomendaciones(),
      derivacion: this.derivacion(),
      diagnosticoIds: diagnosticoIdsArr
    });
  }
}
