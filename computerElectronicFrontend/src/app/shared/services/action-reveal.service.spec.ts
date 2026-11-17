import { TestBed } from '@angular/core/testing';
import { ActionRevealService } from './action-reveal.service';
import { FeedbackService } from './feedback.service';
import { ScrollService } from './scroll.service';

describe('ActionRevealService', () => {
  let service: ActionRevealService;
  let feedback: jasmine.SpyObj<FeedbackService>;
  let scroll: jasmine.SpyObj<ScrollService>;

  beforeEach(() => {
    feedback = jasmine.createSpyObj('FeedbackService', ['show', 'error', 'success']);
    scroll = jasmine.createSpyObj('ScrollService', ['reveal']);
    TestBed.configureTestingModule({
      providers: [
        ActionRevealService,
        { provide: FeedbackService, useValue: feedback },
        { provide: ScrollService, useValue: scroll }
      ]
    });
    service = TestBed.inject(ActionRevealService);
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
