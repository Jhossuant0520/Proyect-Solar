import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NavbarHomepage } from './navbar-homepage';

describe('NavbarHomepage', () => {
  let component: NavbarHomepage;
  let fixture: ComponentFixture<NavbarHomepage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NavbarHomepage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NavbarHomepage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
