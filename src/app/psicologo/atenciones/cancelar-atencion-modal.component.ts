import { Component, EventEmitter, Output, input, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-cancelar-atencion-modal',
  templateUrl: './cancelar-atencion-modal.component.html',
  styleUrls: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule]
})
export class CancelarAtencionModalComponent {
  open = input(false);
  motivo = signal('');

  @Output() closed = new EventEmitter<void>();
  @Output() cancelar = new EventEmitter<string>();

  onClose() {
    this.closed.emit();
  }

  onCancelar() {
    this.cancelar.emit(this.motivo());
  }
}
