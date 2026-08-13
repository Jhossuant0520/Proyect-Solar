import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FooterHomepage } from './footer-homepage';

describe('FooterHomepage', () => {
  let component: FooterHomepage;
  let fixture: ComponentFixture<FooterHomepage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FooterHomepage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FooterHomepage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
