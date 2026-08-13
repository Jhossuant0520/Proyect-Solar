import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StatsHomepage } from './stats-homepage';

describe('StatsHomepage', () => {
  let component: StatsHomepage;
  let fixture: ComponentFixture<StatsHomepage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatsHomepage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StatsHomepage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
