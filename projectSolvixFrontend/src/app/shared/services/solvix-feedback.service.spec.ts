import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SolvixFeedbackService } from './solvix-feedback.service';

describe('SolvixFeedbackService', () => {
  let service: SolvixFeedbackService;
  let snack: jasmine.SpyObj<MatSnackBar>;

  beforeEach(() => {
    snack = jasmine.createSpyObj('MatSnackBar', ['open']);
    TestBed.configureTestingModule({
      providers: [
        SolvixFeedbackService,
        { provide: MatSnackBar, useValue: snack }
      ]
    });
    service = TestBed.inject(SolvixFeedbackService);
  });

  it('success delega a showSolvixSnack con tone success', () => {
    service.success('Producto agregado');
    expect(snack.open).toHaveBeenCalledWith(
      'Producto agregado',
      'Cerrar',
      jasmine.objectContaining({
        duration: 3500,
        panelClass: jasmine.arrayContaining(['solvix-snack', 'solvix-snack--success'])
      })
    );
  });

  it('error usa tone error y duración 5000', () => {
    service.error('No se pudo guardar');
    expect(snack.open).toHaveBeenCalledWith(
      'No se pudo guardar',
      'Cerrar',
      jasmine.objectContaining({
        duration: 5000,
        panelClass: jasmine.arrayContaining(['solvix-snack', 'solvix-snack--error'])
      })
    );
  });

  it('info usa tone info', () => {
    service.info('Producto ya agregado');
    expect(snack.open).toHaveBeenCalledWith(
      'Producto ya agregado',
      'Cerrar',
      jasmine.objectContaining({
        duration: 3500,
        panelClass: jasmine.arrayContaining(['solvix-snack', 'solvix-snack--info'])
      })
    );
  });

  it('ignora mensajes vacíos', () => {
    service.success('   ');
    expect(snack.open).not.toHaveBeenCalled();
  });
});
