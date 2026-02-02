import { ChangeDetectionStrategy, Component, DestroyRef, OnDestroy, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PersonalMilitarService } from '../../services/personal-militar.service';
import { PersonalMilitarDTO, PersonalMilitarPayload, Sexo } from '../../models/personal-militar.models';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GRADOS_MILITARES, PROVINCIAS_ECUADOR, ProvinciaCatalog } from '../../core/config/personal-form.options';

const edadOFechaValidator: ValidatorFn = (group) => {
  const edadControl = group.get('edad');
  const fechaControl = group.get('fechaNacimiento');
  const edadValue = edadControl?.value;
  const fechaValue = fechaControl?.value;
  const edadVacia = edadValue === null || edadValue === undefined || (`${edadValue}`.trim() === '');
  const fechaVacia = !fechaValue || `${fechaValue}`.trim() === '';
  if (!edadVacia || !fechaVacia) {
    return null;
  }
  return { edadOFecha: true } satisfies ValidationErrors;
};

interface PasoFormulario {
  id: string;
  titulo: string;
  descripcion: string;
  controles: string[];
}

@Component({
  selector: 'app-personal-detail',
  templateUrl: './personal-detail.component.html',
  styleUrls: ['./personal-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule]
})
export class PersonalDetailComponent implements OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(PersonalMilitarService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly pasos: ReadonlyArray<PasoFormulario> = [
    { id: 'identificacion', titulo: 'Identificacion', descripcion: 'Cedula y datos basicos', controles: ['cedula', 'apellidosNombres', 'tipoPersona', 'esMilitar'] },
    { id: 'demografia', titulo: 'Datos demograficos', descripcion: 'Nacimiento, sexo y grupo familiar', controles: ['fechaNacimiento', 'edad', 'sexo', 'estadoCivil', 'etnia', 'numeroHijos'] },
    { id: 'servicio', titulo: 'Servicio y situacion', descripcion: 'Condicion laboral y cobertura', controles: ['ocupacion', 'servicioActivo', 'servicioPasivo', 'seguro', 'grado', 'especialidad', 'unidadMilitar'] },
    { id: 'contacto', titulo: 'Ubicacion y contacto', descripcion: 'Direccion, telefonos y estado', controles: ['provincia', 'canton', 'parroquia', 'barrioSector', 'telefono', 'celular', 'email', 'activo'] }
  ];

  readonly sexoOpciones: ReadonlyArray<Sexo> = ['Masculino', 'Femenino'];
  readonly tipoPersonaOpciones: ReadonlyArray<string> = ['Militar', 'Dependiente', 'Civil'];
  readonly estadoCivilOpciones: ReadonlyArray<string> = ['Soltera', 'Soltero', 'Casada', 'Casado', 'Divorciada', 'Divorciado', 'Viuda', 'Viudo', 'Union de hecho', 'Separada', 'Separado'];
  readonly etniaOpciones: ReadonlyArray<string> = ['Mestiza', 'Afroecuatoriana', 'Indigena', 'Montubia', 'Blanca', 'Otra'];
  readonly seguroOpciones: ReadonlyArray<string> = ['ISSFA', 'IESS', 'Privado', 'Ninguno', 'Otro'];
  readonly gradoOpciones = GRADOS_MILITARES;
  readonly provinciaOpciones: ReadonlyArray<string> = PROVINCIAS_ECUADOR.map((provincia) => provincia.nombre);
  readonly cantonOpciones = signal<ReadonlyArray<string>>([]);
  readonly parroquiaOpciones = signal<ReadonlyArray<string>>([]);

  readonly form = this.fb.group({
    cedula: ['', [Validators.required, Validators.maxLength(20)]],
    apellidosNombres: ['', [Validators.required, Validators.maxLength(200)]],
    tipoPersona: ['Militar', Validators.required],
    esMilitar: [true],
    fechaNacimiento: ['', Validators.required],
    edad: [{ value: '', disabled: true }, [Validators.min(0)]],
    sexo: ['Masculino' as Sexo, Validators.required],
    estadoCivil: [''],
    etnia: [''],
    numeroHijos: ['', [Validators.min(0)]],
    ocupacion: ['', [Validators.maxLength(150)]],
    servicioActivo: [true],
    servicioPasivo: [false],
    seguro: [''],
    grado: ['', [Validators.maxLength(100)]],
    especialidad: ['', [Validators.maxLength(150)]],
    unidadMilitar: ['', [Validators.maxLength(150)]],
    provincia: ['', [Validators.maxLength(100)]],
    canton: ['', [Validators.maxLength(100)]],
    parroquia: ['', [Validators.maxLength(100)]],
    barrioSector: ['', [Validators.maxLength(150)]],
    telefono: ['', [Validators.maxLength(20)]],
    celular: ['', [Validators.maxLength(20)]],
    email: ['', [Validators.email, Validators.maxLength(200)]],
    activo: [true]
  }, { validators: edadOFechaValidator });

  readonly cargando = signal(false);
  readonly mensajeError = signal<string | null>(null);
  readonly mensajeExito = signal<string | null>(null);
  readonly pasoActual = signal(0);
  readonly personalId = signal<number | null>(null);
  readonly persona = signal<PersonalMilitarDTO | null>(null);
  private redirectTimeout: ReturnType<typeof setTimeout> | null = null;

  readonly esEdicion = computed(() => Number.isFinite(this.personalId()));
  readonly esUltimoPaso = computed(() => this.pasoActual() === this.pasos.length - 1);
  readonly titulo = computed(() => this.esEdicion() ? 'Actualizar personal militar' : 'Registrar personal militar');
  readonly botonTexto = computed(() => this.esEdicion() ? 'Guardar cambios' : 'Registrar personal');
  
  readonly personaNombre = computed(() => {
    const current = this.persona();
    if (!current) return 'Sin datos';
    const apellidosNombres = current.apellidosNombres?.trim();
    if (apellidosNombres?.length) return apellidosNombres;
    const partes = [current.apellidos, current.nombres]
      .filter((parte): parte is string => !!parte && parte.trim().length > 0)
      .map(parte => parte.trim());
    return partes.length ? partes.join(' ') : 'Sin nombres registrados';
  });

  readonly unidadPersona = computed(() => {
    const p = this.persona();
    return p?.unidadMilitar || p?.unidad;
  });

  readonly situacionPersona = computed(() => {
    const p = this.persona();
    if (p?.servicioActivo) return 'Activo';
    if (p?.servicioPasivo) return 'Pasivo';
    return p?.ocupacion || 'No especificada';
  });

  constructor() {
    this.configurarUbicacionReactividad();
    this.configurarCalculoEdad();
    this.resolverContexto();
  }

  private configurarCalculoEdad() {
    const fechaNacimientoControl = this.form.get('fechaNacimiento');
    const edadControl = this.form.get('edad');

    if (!fechaNacimientoControl || !edadControl) {
      return;
    }

    fechaNacimientoControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((fechaStr) => {
        if (!fechaStr || typeof fechaStr !== 'string') {
          return;
        }

        const fechaNacimiento = new Date(fechaStr);
        if (isNaN(fechaNacimiento.getTime())) {
          return;
        }

        const hoy = new Date();
        let edadCalculada = hoy.getFullYear() - fechaNacimiento.getFullYear();
        
        const mesActual = hoy.getMonth();
        const diaActual = hoy.getDate();
        const mesNacimiento = fechaNacimiento.getMonth();
        const diaNacimiento = fechaNacimiento.getDate();

        if (mesActual < mesNacimiento || (mesActual === mesNacimiento && diaActual < diaNacimiento)) {
          edadCalculada--;
        }

        if (edadCalculada >= 0 && edadCalculada <= 120) {
          edadControl.setValue(edadCalculada.toString(), { emitEvent: false });
          edadControl.markAsTouched();
        } else {
          edadControl.setValue('', { emitEvent: false });
        }
      });
  }

  private configurarUbicacionReactividad() {
    const provinciaControl = this.form.get('provincia');
    const cantonControl = this.form.get('canton');
    const parroquiaControl = this.form.get('parroquia');

    if (!provinciaControl || !cantonControl || !parroquiaControl) {
      return;
    }

    const syncParroquias = (provinciaCatalogo: ProvinciaCatalog, cantonNombre: string | null) => {
      if (!cantonNombre) {
        this.parroquiaOpciones.set([]);
        if (parroquiaControl.value) {
          parroquiaControl.setValue('', { emitEvent: false });
        }
        return;
      }
      const parroquias = this.buscarCanton(provinciaCatalogo, cantonNombre)?.parroquias ?? [];
      this.parroquiaOpciones.set(parroquias);
      const parroquiaActual = this.normalizeOptionalString(parroquiaControl.value);
      const parroquiaCoincidente = this.encontrarCoincidencia(parroquiaActual, parroquias);
      if (parroquiaCoincidente) {
        if (parroquiaCoincidente !== parroquiaControl.value) {
          parroquiaControl.setValue(parroquiaCoincidente, { emitEvent: false });
        }
        return;
      }
      if (parroquiaControl.value) {
        parroquiaControl.setValue('', { emitEvent: false });
      }
    };

    const syncCantones = (provinciaValor: unknown) => {
      const provinciaNombre = this.normalizeOptionalString(provinciaValor);
      const provinciaCatalogo = this.buscarProvincia(provinciaNombre);
      if (!provinciaCatalogo) {
        this.cantonOpciones.set([]);
        this.parroquiaOpciones.set([]);
        return;
      }
      const cantones = provinciaCatalogo?.cantones.map((canton) => canton.nombre) ?? [];
      this.cantonOpciones.set(cantones);
      const cantonActual = this.normalizeOptionalString(cantonControl.value);
      const cantonCoincidente = this.encontrarCoincidencia(cantonActual, cantones);
      if (cantonCoincidente) {
        if (cantonCoincidente !== cantonControl.value) {
          cantonControl.setValue(cantonCoincidente, { emitEvent: false });
        }
        syncParroquias(provinciaCatalogo, cantonCoincidente);
        return;
      }
      if (cantonControl.value) {
        cantonControl.setValue('', { emitEvent: false });
      }
      syncParroquias(provinciaCatalogo, null);
    };

    provinciaControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((valor) => syncCantones(valor));

    cantonControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((valor) => {
        const provinciaNombre = this.normalizeOptionalString(provinciaControl.value);
        const provinciaCatalogo = this.buscarProvincia(provinciaNombre);
        if (!provinciaCatalogo) {
          this.parroquiaOpciones.set([]);
          return;
        }
        const cantonNombre = this.encontrarCoincidencia(this.normalizeOptionalString(valor), provinciaCatalogo?.cantones.map((item) => item.nombre) ?? []);
        syncParroquias(provinciaCatalogo, cantonNombre);
      });

    syncCantones(provinciaControl.value);
  }

  personaIniciales(): string {
    const nombre = this.personaNombre();
    const partes = nombre.split(' ').filter(p => p.trim().length);
    const letras = partes.slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('');
    return letras || 'P';
  }

  tipoPersonaBadgeClass(): string {
    const tipo = this.persona()?.tipoPersona?.trim().toLowerCase();
    if (tipo === 'militar') return 'bg-emerald-600 text-white shadow-lg';
    if (tipo === 'dependiente') return 'bg-indigo-600 text-white shadow-lg';
    if (tipo === 'civil') return 'bg-sky-600 text-white shadow-lg';
    return 'bg-slate-500 text-white';
  }

  pasoCardClass(index: number): string {
    const activo = this.pasoActual() === index;
    if (activo) {
      return 'rounded-2xl border-2 border-slate-900 bg-gradient-to-r from-slate-800 to-slate-900 p-4 text-white shadow-lg ring-1 ring-white/10';
    }
    return 'rounded-2xl border-2 border-slate-200 bg-white p-4 text-slate-900 shadow-sm hover:border-slate-300 hover:shadow-md';
  }

  pasoIndicatorClass(index: number): string {
    const activo = this.pasoActual() === index;
    return activo
      ? 'inline-flex h-2 w-2 animate-ping rounded-full bg-emerald-400'
      : 'inline-flex h-2 w-2 rounded-full bg-slate-300';
  }

  onSubmit() {
    this.mensajeError.set(null);
    this.mensajeExito.set(null);
    if (this.esUltimoPaso()) {
      this.guardar();
      return;
    }
    this.irAlSiguientePaso();
  }

  retroceder() {
    this.mensajeError.set(null);
    this.mensajeExito.set(null);
    this.pasoActual.update((valor) => Math.max(valor - 1, 0));
  }

  cerrar() {
    this.clearRedirectTimeout();
    this.router.navigate(['/psicologo/personal']).catch(() => {});
  }

  eliminar() {
    const id = this.personalId();
    if (!Number.isFinite(id)) {
      this.mensajeError.set('No se puede eliminar un registro sin identificador.');
      return;
    }
    const confirmacion = globalThis.confirm('¿Deseas eliminar este registro de personal militar?');
    if (!confirmacion) {
      return;
    }
    this.cargando.set(true);
    this.mensajeError.set(null);
    this.service.eliminar(Number(id)).subscribe({
      next: () => {
        this.cargando.set(false);
        this.router.navigate(['/psicologo/personal'], {
          replaceUrl: true,
          state: { mensaje: 'Personal eliminado correctamente.' }
        }).catch(() => {});
      },
      error: (err) => {
        this.cargando.set(false);
        this.mensajeError.set(this.resolverError(err));
      }
    });
  }

  controlConError(controlName: string): boolean {
    const control = this.form.get(controlName);
    if (!control) {
      return false;
    }
    return control.invalid && (control.dirty || control.touched);
  }

  edadOFechaInvalido(): boolean {
    if (this.pasoActual() !== 1) {
      return false;
    }
    return this.form.hasError('edadOFecha');
  }

  private irAlSiguientePaso() {
    const seccionValida = this.validarSeccionActual();
    if (!seccionValida) {
      this.mensajeError.set('Completa los datos de esta seccion antes de continuar.');
      return;
    }

    if (this.pasoActual() === 0) {
      this.verificarExistencia();
      return;
    }

    this.pasoActual.update((valor) => Math.min(valor + 1, this.pasos.length - 1));
  }

  private validarSeccionActual(): boolean {
    const paso = this.pasos[this.pasoActual()];
    let valido = true;
    for (const controlName of paso.controles) {
      const control = this.form.get(controlName);
      if (!control) {
        continue;
      }
      control.markAsTouched();
      control.updateValueAndValidity();
      if (control.invalid) {
        valido = false;
      }
    }
    if (this.pasoActual() === 1 && this.form.hasError('edadOFecha')) {
      valido = false;
    }
    return valido;
  }

  private verificarExistencia() {
    const cedulaControl = this.form.get('cedula');
    const cedula = this.normalizeOptionalString(cedulaControl?.value);
    if (!cedula) {
      this.mensajeError.set('La cedula es obligatoria para continuar.');
      cedulaControl?.markAsTouched();
      return;
    }

    this.cargando.set(true);
    this.mensajeError.set(null);
    this.service.buscarPorCedula(cedula).subscribe({
      next: (res) => {
        this.cargando.set(false);
        this.personalId.set(res.id ?? null);
        this.persona.set(res);
        this.patchForm(res);
        this.mensajeExito.set('Se encontro un registro con esta cedula. Actualiza los datos y guarda los cambios.');
        this.pasoActual.update((valor) => Math.min(valor + 1, this.pasos.length - 1));
      },
      error: (err) => {
        this.cargando.set(false);
        // Si el backend responde 404 o 500, permitir crear nuevo registro
        const status = (err && typeof err === 'object' && 'status' in err) ? (err as { status?: number }).status : undefined;
        if (status === 404 || status === 500) {
          this.personalId.set(null);
          this.persona.set(null);
          this.mensajeExito.set('No existen registros con esta cedula. Completa las secciones siguientes para crear uno nuevo.');
          this.pasoActual.update((valor) => Math.min(valor + 1, this.pasos.length - 1));
          return;
        }
        this.mensajeError.set(this.resolverError(err));
      }
    });
  }

  private guardar() {
    const valido = this.validarSeccionActual();
    if (!valido) {
      this.mensajeError.set('Revisa los datos antes de guardar.');
      return;
    }

    const apellidosNombres = this.form.get('apellidosNombres')?.value;
    if (!apellidosNombres || apellidosNombres.trim() === '') {
      this.mensajeError.set('El campo "Apellidos y nombres" es obligatorio.');
      this.form.get('apellidosNombres')?.markAsTouched();
      return;
    }

    const payload = this.buildPayload();
    if (!payload) {
      return;
    }

    const idActual = this.personalId();
    this.cargando.set(true);
    this.mensajeError.set(null);
    this.mensajeExito.set(null);
    this.clearRedirectTimeout();

    const accion = Number.isFinite(idActual)
      ? this.service.actualizar(Number(idActual), payload)
      : this.service.crear(payload);

    accion.subscribe({
      next: (res) => {
        this.cargando.set(false);
        const personaFinal: PersonalMilitarDTO = { ...res, id: res.id ?? idActual ?? undefined };
        this.personalId.set(personaFinal.id ?? null);
        this.persona.set(personaFinal);
        this.patchForm(personaFinal);
        const mensaje = this.esEdicion() ? 'Cambios guardados correctamente. Redirigiendo al historial clinico.' : 'Personal registrado correctamente. Redirigiendo al historial clinico.';
        this.mensajeExito.set(mensaje);
        this.form.markAsPristine();
        this.form.markAsUntouched();
        this.clearRedirectTimeout();
        const destinoId = personaFinal.id ?? res.id;
        if (Number.isFinite(destinoId)) {
          this.redirectTimeout = setTimeout(() => {
            this.router.navigate(['/psicologo/personal', Number(destinoId), 'historial'], {
              replaceUrl: true,
              state: { mensaje: 'Personal guardado correctamente. Ver historial y crear fichas.' }
            }).catch(() => {});
          }, 1200);
        }
      },
      error: (err) => {
        this.cargando.set(false);
        this.mensajeError.set(this.resolverError(err));
      }
    });
  }

  private resolverContexto() {
    const param = this.route.snapshot.paramMap.get('personalId');
    const id = this.parseNumeric(param);
    if (id !== null) {
      this.personalId.set(id);
    }

    const historyState = (globalThis.history?.state ?? {}) as Record<string, unknown>;
    const statePersona = (historyState['persona'] ?? null) as PersonalMilitarDTO | null;
    const personaId = this.parseNumeric(statePersona?.id);
    if (statePersona && (id === null || (personaId !== null && personaId === id))) {
      this.persona.set(statePersona);
      this.patchForm(statePersona);
    }

    if (id !== null && !this.persona()) {
      this.cargando.set(true);
      this.service.obtenerPorId(id).subscribe({
        next: (res) => {
          this.cargando.set(false);
          const resolvedId = this.parseNumeric(res.id) ?? id;
          this.personalId.set(resolvedId);
          this.persona.set(res);
          this.patchForm(res);
        },
        error: (err) => {
          this.cargando.set(false);
          this.mensajeError.set(this.resolverError(err));
        }
      });
    }
  }

  private buscarProvincia(nombre: string | null): ProvinciaCatalog | null {
    if (!nombre) {
      return null;
    }
    const objetivo = nombre.toLowerCase();
    return PROVINCIAS_ECUADOR.find((provincia) => provincia.nombre.toLowerCase() === objetivo) ?? null;
  }

  private buscarCanton(
    provincia: ProvinciaCatalog | null,
    cantonNombre: string | null
  ): ProvinciaCatalog['cantones'][number] | null {
    if (!provincia || !cantonNombre) {
      return null;
    }
    const objetivo = cantonNombre.toLowerCase();
    return provincia.cantones.find((canton) => canton.nombre.toLowerCase() === objetivo) ?? null;
  }

  private encontrarCoincidencia(valor: string | null, opciones: ReadonlyArray<string>): string | null {
    if (!valor || !opciones.length) {
      return null;
    }
    const objetivo = valor.toLowerCase();
    for (const opcion of opciones) {
      if (opcion.toLowerCase() === objetivo) {
        return opcion;
      }
    }
    return null;
  }

  private patchForm(persona: PersonalMilitarDTO) {
    this.form.patchValue({
      cedula: persona.cedula ?? '',
      apellidosNombres: this.resolveApellidosNombres(persona),
      tipoPersona: persona.tipoPersona ?? (persona.esMilitar ? 'Militar' : 'Dependiente'),
      esMilitar: typeof persona.esMilitar === 'boolean' ? persona.esMilitar : (persona.tipoPersona?.toLowerCase() === 'militar'),
      fechaNacimiento: this.normalizeDateInput(persona.fechaNacimiento),
      edad: typeof persona.edad === 'number' ? String(persona.edad) : '',
      sexo: this.mapSexoFromApi(persona.sexo),
      estadoCivil: persona.estadoCivil ?? '',
      etnia: persona.etnia ?? '',
      numeroHijos: typeof persona.numeroHijos === 'number' ? String(persona.numeroHijos) : (typeof persona.nroHijos === 'number' ? String(persona.nroHijos) : ''),
      ocupacion: persona.ocupacion ?? '',
      servicioActivo: typeof persona.servicioActivo === 'boolean' ? persona.servicioActivo : true,
      servicioPasivo: typeof persona.servicioPasivo === 'boolean' ? persona.servicioPasivo : false,
      seguro: persona.seguro ?? '',
      grado: persona.grado ?? '',
      especialidad: persona.especialidad ?? '',
      unidadMilitar: persona.unidadMilitar ?? persona.unidad ?? '',
      provincia: persona.provincia ?? '',
      canton: persona.canton ?? '',
      parroquia: persona.parroquia ?? '',
      barrioSector: persona.barrioSector ?? '',
      telefono: persona.telefono ?? '',
      celular: persona.celular ?? '',
      email: persona.email ?? '',
      activo: typeof persona.activo === 'boolean' ? persona.activo : true
    });
    this.form.markAsPristine();
    this.form.markAsUntouched();
  }

  private buildPayload(): PersonalMilitarPayload | null {
    const raw = this.form.getRawValue();

    if (!raw.apellidosNombres || raw.apellidosNombres.trim() === '') {
      this.mensajeError.set('El campo "Apellidos y nombres" es obligatorio.');
      return null;
    }

    if (!this.form.valid) {
      this.mensajeError.set('Por favor, corrige los errores en el formulario antes de guardar.');
      return null;
    }

    const cedula = this.normalizeRequiredString(raw.cedula, 'cedula');
    const apellidosNombres = this.normalizeRequiredString(raw.apellidosNombres, 'apellidos y nombres');
    const tipoPersona = this.normalizeRequiredString(raw.tipoPersona, 'tipo de persona');
    const sexo = this.mapSexoForApi(raw.sexo);

    if (!cedula || !apellidosNombres || !tipoPersona || !sexo) {
      return null;
    }

    let edad: number | null = null;
    if (raw.edad !== null && raw.edad !== undefined && `${raw.edad}`.trim() !== '') {
      const parsed = Number(raw.edad);
      if (!Number.isFinite(parsed) || parsed < 0) {
        this.mensajeError.set('La edad debe ser un numero mayor o igual a cero.');
        return null;
      }
      edad = Math.trunc(parsed);
    }

    const fechaNacimiento = this.normalizeOptionalString(raw.fechaNacimiento);
    if (edad == null && !fechaNacimiento) {
      this.mensajeError.set('Debes proporcionar la edad o la fecha de nacimiento.');
      return null;
    }

    let nroHijos: number = 0;
    if (raw.numeroHijos !== null && raw.numeroHijos !== undefined && `${raw.numeroHijos}`.trim() !== '') {
      const parsed = Number(raw.numeroHijos);
      if (!Number.isFinite(parsed) || parsed < 0) {
        this.mensajeError.set('El numero de hijos debe ser un valor igual o mayor a cero.');
        return null;
      }
      nroHijos = Math.trunc(parsed);
    }

    const email = this.normalizeOptionalString(raw.email);
    if (email && this.form.get('email')?.invalid) {
      this.mensajeError.set('Ingresa un correo electronico valido.');
      return null;
    }

    const payload: PersonalMilitarPayload = {
      cedula,
      apellidosNombres,
      sexo,
      tipoPersona,
      esMilitar: !!raw.esMilitar,
      fechaNacimiento: fechaNacimiento || null,
      edad: edad || null,
      nroHijos,
      activo: !!raw.activo,
      servicioActivo: !!raw.servicioActivo,
      servicioPasivo: !!raw.servicioPasivo,
      etnia: this.normalizeOptionalString(raw.etnia) || null,
      estadoCivil: this.normalizeOptionalString(raw.estadoCivil) || null,
      ocupacion: this.normalizeOptionalString(raw.ocupacion) || null,
      seguro: this.normalizeOptionalString(raw.seguro) || null,
      grado: this.normalizeOptionalString(raw.grado) || null,
      unidadMilitar: this.normalizeOptionalString(raw.unidadMilitar) || null,
      especialidad: this.normalizeOptionalString(raw.especialidad) || null,
      provincia: this.normalizeOptionalString(raw.provincia) || null,
      canton: this.normalizeOptionalString(raw.canton) || null,
      parroquia: this.normalizeOptionalString(raw.parroquia) || null,
      barrioSector: this.normalizeOptionalString(raw.barrioSector) || null,
      telefono: this.normalizeOptionalString(raw.telefono) || null,
      celular: this.normalizeOptionalString(raw.celular) || null,
      email: email || null
    };

    return payload;
  }

  private resolveApellidosNombres(persona: PersonalMilitarDTO): string {
    const apellidosNombres = persona.apellidosNombres?.trim();
    if (apellidosNombres?.length) {
      return apellidosNombres;
    }
    const partes = [persona.apellidos, persona.nombres]
      .filter((parte): parte is string => !!parte && parte.trim().length > 0)
      .map((parte) => parte.trim());
    return partes.join(' ').trim();
  }

  private normalizeDateInput(value?: string): string {
    if (!value) {
      return '';
    }
    const trimmed = value.trim();
    if (!trimmed) {
      return '';
    }
    if (trimmed.length >= 10) {
      return trimmed.slice(0, 10);
    }
    return trimmed;
  }

  private normalizeRequiredString(value: unknown, etiqueta: string): string | null {
    const normalizado = this.normalizeOptionalString(value);
    if (!normalizado || normalizado.trim() === '') {
      this.mensajeError.set(`El campo "${etiqueta}" es obligatorio.`);
      return null;
    }
    return normalizado.trim();
  }

  private mapSexoFromApi(value: unknown): Sexo {
    if (typeof value === 'string') {
      const normalized = value.trim().toUpperCase();
      if (normalized.startsWith('F') || normalized === 'FEMENINO') {
        return 'Femenino';
      }
      if (normalized.startsWith('M') || normalized === 'MASCULINO' || normalized === 'HOMBRE') {
        return 'Masculino';
      }
    }
    return 'Masculino';
  }

  private mapSexoForApi(value: unknown): string | null {
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (normalized === 'femenino') {
        return 'Femenino';
      }
      if (normalized === 'masculino') {
        return 'Masculino';
      }
    }
    this.mensajeError.set('Selecciona un sexo válido.');
    return null;
  }

  private parseNumeric(value: unknown): number | null {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : null;
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed.length) {
        return null;
      }
      const parsed = Number(trimmed);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }

  private normalizeOptionalString(value: unknown): string | null {
    if (value === null || value === undefined) {
      return null;
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    }
    if (typeof value === 'number') {
      return String(value);
    }
    return null;
  }

  private resolverError(err: unknown): string {
    const status = this.extractStatus(err);
    const mensaje = this.extractErrorMessage(err) || '';

    if (status === 400) {
      return 'Los datos enviados no cumplen con las validaciones del servicio. Revisa los campos obligatorios.';
    }
    if (status === 404) {
      return 'No se encontró el recurso solicitado.';
    }
    if (status === 409) {
      return 'La cédula ya se encuentra registrada en el sistema.';
    }
    if (status === 500) {
      return 'Error interno del servidor. Intenta nuevamente más tarde.';
    }
    
    return mensaje || 'Ocurrió un error al procesar la solicitud. Por favor, intenta nuevamente.';
  }
  
  private extractStatus(err: unknown): number | null {
    if (err && typeof err === 'object' && 'status' in err) {
      const status = (err as { status?: unknown }).status;
      if (typeof status === 'number') {
        return status;
      }
    }
    return null;
  }
  
  private extractErrorMessage(err: unknown): string | null {
    if (!err || typeof err !== 'object') {
      return null;
    }
    
    const posiblesPropiedades = ['error', 'message', 'detail', 'mensaje'];
    for (const prop of posiblesPropiedades) {
      if (prop in err) {
        const valor = (err as Record<string, unknown>)[prop];
        if (typeof valor === 'string' && valor.trim()) {
          return valor.trim();
        }
        if (valor && typeof valor === 'object') {
          const mensajeAnidado = this.extractErrorMessage(valor);
          if (mensajeAnidado) {
            return mensajeAnidado;
          }
        }
      }
    }
    
    return null;
  }

  ngOnDestroy(): void {
    this.clearRedirectTimeout();
  }

  private clearRedirectTimeout() {
    if (this.redirectTimeout !== null) {
      clearTimeout(this.redirectTimeout);
      this.redirectTimeout = null;
    }
  }
}