import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { SpaceEventsService } from 'src/app/services/space-events.service';
import { catchError, of, tap } from 'rxjs';
import { ModalController } from '@ionic/angular';
import { CreateEventFormComponent } from 'src/app/components/create-event-form/create-event-form.component';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
})
export class HomePage implements OnInit {
  events: any[] = [];

  constructor(
    private spaceEventsService: SpaceEventsService,
    private modalController: ModalController
  ) {}

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

  async openCreateEventModal() {
    const modal = await this.modalController.create({
      component: CreateEventFormComponent,
    });
    await modal.present();

    const { data, role } = await modal.onWillDismiss();
    if (role === 'created' && data) {
      this.loadEvents(); 
    }
  }
}