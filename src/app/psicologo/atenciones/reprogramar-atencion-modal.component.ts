import { Component, EventEmitter, Output, input, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-reprogramar-atencion-modal',
  templateUrl: './reprogramar-atencion-modal.component.html',
  styleUrls: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule]
})
export class ReprogramarAtencionModalComponent {
  open = input(false);
  nuevaFecha = signal('');
  motivoReprogramacion = signal('');

  @Output() closed = new EventEmitter<void>();
  @Output() reprogramar = new EventEmitter<{ fecha: string; motivoReprogramacion: string }>();

  onClose() {
    this.closed.emit();
  }

  onReprogramar() {
    this.reprogramar.emit({ fecha: this.nuevaFecha(), motivoReprogramacion: this.motivoReprogramacion() });
  }
}
