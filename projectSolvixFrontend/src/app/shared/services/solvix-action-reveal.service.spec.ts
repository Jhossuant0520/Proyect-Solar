import { TestBed } from '@angular/core/testing';
import { SolvixActionRevealService } from './solvix-action-reveal.service';
import { SolvixFeedbackService } from './solvix-feedback.service';
import { SolvixScrollService } from './solvix-scroll.service';

describe('SolvixActionRevealService', () => {
  let service: SolvixActionRevealService;
  let feedback: jasmine.SpyObj<SolvixFeedbackService>;
  let scroll: jasmine.SpyObj<SolvixScrollService>;

  beforeEach(() => {
    feedback = jasmine.createSpyObj('SolvixFeedbackService', ['show', 'error', 'success']);
    scroll = jasmine.createSpyObj('SolvixScrollService', ['reveal']);
    TestBed.configureTestingModule({
      providers: [
        SolvixActionRevealService,
        { provide: SolvixFeedbackService, useValue: feedback },
        { provide: SolvixScrollService, useValue: scroll }
      ]
    });
    service = TestBed.inject(SolvixActionRevealService);
  });

  it('success muestra feedback y revela target tras paint', done => {
    service.success({ message: 'Producto agregado', target: '#linea-0' });
    expect(feedback.show).toHaveBeenCalledWith('Producto agregado', 'success');
    setTimeout(() => {
      expect(scroll.reveal).toHaveBeenCalledWith(
        '#linea-0',
        jasmine.objectContaining({})
      );
      done();
    }, 30);
  });

  it('sin target solo feedback', () => {
    service.success({ message: 'Guardado' });
    expect(feedback.show).toHaveBeenCalled();
    expect(scroll.reveal).not.toHaveBeenCalled();
  });

  it('error solo snack de error', () => {
    service.error('Falló');
    expect(feedback.error).toHaveBeenCalledWith('Falló');
  });
});
