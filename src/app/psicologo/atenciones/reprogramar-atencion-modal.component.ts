import { Component, EventEmitter, Output, input, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-reprogramar-atencion-modal',
  templateUrl: './reprogramar-atencion-modal.component.html',
  styleUrls: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule]
})
export class ReprogramarAtencionModalComponent {
  open = input(false);
  nuevaFecha = signal('');
  motivo = signal('');

  @Output() closed = new EventEmitter<void>();
  @Output() reprogramar = new EventEmitter<{ fecha: string; motivo: string }>();

  onClose() {
    this.closed.emit();
  }

  onReprogramar() {
    this.reprogramar.emit({ fecha: this.nuevaFecha(), motivo: this.motivo() });
  }
}
