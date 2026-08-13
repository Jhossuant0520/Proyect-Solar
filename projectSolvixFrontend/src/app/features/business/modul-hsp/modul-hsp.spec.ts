import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModulHsp } from './modul-hsp';

describe('ModulHsp', () => {
  let component: ModulHsp;
  let fixture: ComponentFixture<ModulHsp>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModulHsp]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModulHsp);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
