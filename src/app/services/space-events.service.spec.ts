import { TestBed } from '@angular/core/testing';

import { SpaceEventsService } from './space-events.service';

describe('SpaceEventsService', () => {
  let service: SpaceEventsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SpaceEventsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
