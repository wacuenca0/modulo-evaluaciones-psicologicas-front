import { ChangeDetectionStrategy, Component, Input, Output, EventEmitter, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AtencionPsicologicaService } from '../../../services/atenciones-psicologicas.service';

@Component({
  selector: 'app-atencion-detalle',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './atencion-detalle.component.html',
  styleUrls: ['./atencion-detalle.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AtencionDetalleComponent {
  @Input() show = false;
  @Input() atencionId: number | null = null;
  @Output() cerrar = new EventEmitter<void>();
  atencion: any = null;

  private readonly atencionService = inject(AtencionPsicologicaService);
  private readonly cdr = inject(ChangeDetectorRef);

  ngOnChanges(): void {
    if (this.show && this.atencionId) {
      this.cargarDetalleAtencion(this.atencionId);
    }
  }

  cargarDetalleAtencion(id: number) {
    this.atencionService.obtenerPorId(id).subscribe({
      next: (data: any) => {
        this.atencion = data;
        this.cdr.markForCheck();
      },
      error: () => {
        this.atencion = null;
        this.cdr.markForCheck();
      }
    });
  }
}
