import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AboutHomepage } from './about-homepage';

describe('AboutHomepage', () => {
  let component: AboutHomepage;
  let fixture: ComponentFixture<AboutHomepage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AboutHomepage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AboutHomepage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
