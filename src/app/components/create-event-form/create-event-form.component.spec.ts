import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { CreateEventFormComponent } from './create-event-form.component';

describe('CreateEventFormComponent', () => {
  let component: CreateEventFormComponent;
  let fixture: ComponentFixture<CreateEventFormComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [CreateEventFormComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateEventFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
