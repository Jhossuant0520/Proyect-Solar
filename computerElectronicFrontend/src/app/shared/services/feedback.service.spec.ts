import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CeSnackComponent } from '../components/ce-snack/ce-snack';
import { FeedbackService } from './feedback.service';

describe('FeedbackService', () => {
  let service: FeedbackService;
  let snack: jasmine.SpyObj<MatSnackBar>;

  beforeEach(() => {
    snack = jasmine.createSpyObj('MatSnackBar', ['open', 'openFromComponent']);
    TestBed.configureTestingModule({
      providers: [
        FeedbackService,
        { provide: MatSnackBar, useValue: snack }
      ]
    });
    service = TestBed.inject(FeedbackService);
  });

  it('success abre el toast compacto con tone success', () => {
    service.success('Producto agregado');
    expect(snack.openFromComponent).toHaveBeenCalledWith(
      CeSnackComponent,
      jasmine.objectContaining({
        duration: 3500,
        panelClass: jasmine.arrayContaining(['ce-snack', 'ce-snack--success']),
        data: { message: 'Producto agregado', tone: 'success' }
      })
    );
    expect(snack.open).not.toHaveBeenCalled();
  });

  it('error usa tone error y duración 5000', () => {
    service.error('No se pudo guardar');
    expect(snack.openFromComponent).toHaveBeenCalledWith(
      CeSnackComponent,
      jasmine.objectContaining({
        duration: 5000,
        panelClass: jasmine.arrayContaining(['ce-snack', 'ce-snack--error']),
        data: { message: 'No se pudo guardar', tone: 'error' }
      })
    );
  });

  it('info usa tone info', () => {
    service.info('Producto ya agregado');
    expect(snack.openFromComponent).toHaveBeenCalledWith(
      CeSnackComponent,
      jasmine.objectContaining({
        duration: 3500,
        panelClass: jasmine.arrayContaining(['ce-snack', 'ce-snack--info']),
        data: { message: 'Producto ya agregado', tone: 'info' }
      })
    );
  });

  it('ignora mensajes vacíos', () => {
    service.success('   ');
    expect(snack.openFromComponent).not.toHaveBeenCalled();
  });
});
