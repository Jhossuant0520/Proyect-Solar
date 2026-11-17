import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Contact } from './contact';

describe('Contact', () => {
  let component: Contact;
  let fixture: ComponentFixture<Contact>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Contact]
    }).compileComponents();

    fixture = TestBed.createComponent(Contact);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('usa layout semántico con info e iconos emparejados', () => {
    const items = fixture.nativeElement.querySelectorAll('.contact-info__item');
    expect(items.length).toBe(3);
    items.forEach((item: HTMLElement) => {
      expect(item.querySelector('.contact-info__icon')).toBeTruthy();
      expect(item.querySelector('.contact-info__content')).toBeTruthy();
    });
    expect(fixture.nativeElement.querySelector('.contact-form')).toBeTruthy();
  });

  it('valida campos requeridos sin inventar envío backend', () => {
    component.onSubmit();
    expect(component.invalid).toBeTrue();
    expect(component.noBackend).toBeFalse();

    component.form = {
      name: 'Ana',
      phone: '300',
      serviceType: 'reparacion',
      message: 'No enciende',
      privacy: true
    };
    const openSpy = spyOn(window, 'open');
    component.onSubmit();
    expect(component.invalid).toBeFalse();
    expect(component.noBackend).toBeTrue();
    expect(openSpy).toHaveBeenCalled();
    const url = String(openSpy.calls.mostRecent().args[0] ?? '');
    expect(url).toContain('wa.me/573172901206');
  });
});
