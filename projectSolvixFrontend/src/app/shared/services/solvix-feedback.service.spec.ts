import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SolvixSnackComponent } from '../components/solvix-snack/solvix-snack';
import { SolvixFeedbackService } from './solvix-feedback.service';

describe('SolvixFeedbackService', () => {
  let service: SolvixFeedbackService;
  let snack: jasmine.SpyObj<MatSnackBar>;

  beforeEach(() => {
    snack = jasmine.createSpyObj('MatSnackBar', ['open', 'openFromComponent']);
    TestBed.configureTestingModule({
      providers: [
        SolvixFeedbackService,
        { provide: MatSnackBar, useValue: snack }
      ]
    });
    service = TestBed.inject(SolvixFeedbackService);
  });

  it('success abre el toast compacto con tone success', () => {
    service.success('Producto agregado');
    expect(snack.openFromComponent).toHaveBeenCalledWith(
      SolvixSnackComponent,
      jasmine.objectContaining({
        duration: 3500,
        panelClass: jasmine.arrayContaining(['solvix-snack', 'solvix-snack--success']),
        data: { message: 'Producto agregado', tone: 'success' }
      })
    );
    expect(snack.open).not.toHaveBeenCalled();
  });

  it('error usa tone error y duración 5000', () => {
    service.error('No se pudo guardar');
    expect(snack.openFromComponent).toHaveBeenCalledWith(
      SolvixSnackComponent,
      jasmine.objectContaining({
        duration: 5000,
        panelClass: jasmine.arrayContaining(['solvix-snack', 'solvix-snack--error']),
        data: { message: 'No se pudo guardar', tone: 'error' }
      })
    );
  });

  it('info usa tone info', () => {
    service.info('Producto ya agregado');
    expect(snack.openFromComponent).toHaveBeenCalledWith(
      SolvixSnackComponent,
      jasmine.objectContaining({
        duration: 3500,
        panelClass: jasmine.arrayContaining(['solvix-snack', 'solvix-snack--info']),
        data: { message: 'Producto ya agregado', tone: 'info' }
      })
    );
  });

  it('ignora mensajes vacíos', () => {
    service.success('   ');
    expect(snack.openFromComponent).not.toHaveBeenCalled();
  });
});
