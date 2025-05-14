import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { SpaceEventsService } from 'src/app/services/space-events.service';
import { catchError, of, tap } from 'rxjs';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
})
export class HomePage implements OnInit {
  events: any[] = [];

  constructor(private spaceEventsService: SpaceEventsService) {}

  ngOnInit() {
    this.loadEvents();
  }

  loadEvents() {
    this.spaceEventsService.getSpaceEvents().pipe(
      tap((events: any[]) => {
        console.log("Eventos obtenidos:", events);
          this.events = events;
      }),
      catchError(error => {
        console.error('Error fetching space events:', error);
        return of([]);
        })
    ).subscribe();
  } 
}