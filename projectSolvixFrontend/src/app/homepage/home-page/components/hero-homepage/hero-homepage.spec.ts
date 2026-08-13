import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HeroHomepage } from './hero-homepage';

describe('HeroHomepage', () => {
  let component: HeroHomepage;
  let fixture: ComponentFixture<HeroHomepage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeroHomepage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HeroHomepage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
