import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, input, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-cancelar-atencion-modal',
  standalone: true,
  templateUrl: './cancelar-atencion-modal.component.html',
  styleUrls: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule]
})
export class CancelarAtencionModalComponent {
  open = input(false);
  motivo = '';

  @Output() closed = new EventEmitter<void>();
  @Output() cancelar = new EventEmitter<string>();

  onClose() {
    this.closed.emit();
  }

  onCancelar() {
    this.cancelar.emit(this.motivo);
  }
}
