import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { VerificarEmail } from './verificar-email';

describe('VerificarEmail', () => {
  let component: VerificarEmail;
  let fixture: ComponentFixture<VerificarEmail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VerificarEmail, HttpClientTestingModule, RouterTestingModule],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: () => 'test-token'
              }
            }
          }
        }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VerificarEmail);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
