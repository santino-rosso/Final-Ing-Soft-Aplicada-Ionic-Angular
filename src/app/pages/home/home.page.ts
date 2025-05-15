import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { SpaceEventsService } from 'src/app/services/space-events.service';
import { catchError, of, tap } from 'rxjs';
import { ActionSheetController, ModalController } from '@ionic/angular';
import { CreateEventFormComponent } from 'src/app/components/create-event-form/create-event-form.component';
import { MissionsService } from 'src/app/services/missions.service';

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
    private modalController: ModalController,
    private missionsService: MissionsService,
    private actionSheetController: ActionSheetController
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

  deleteEvent(event: any) {
    if (confirm(`¿Seguro que deseas eliminar el evento "${event.name}"?`)) {
      this.spaceEventsService.deleteEvent(event.id).subscribe({
        next: () => {
          if (event.mission && event.mission.id) {
            this.missionsService.deleteMission(event.mission.id).subscribe({
              next: () => {
                this.loadEvents();
              },
              error: () => {
                alert('Error al eliminar la misión asociada');
                this.loadEvents();
              }
            });
          } else {
            this.loadEvents();
          }
        },
        error: () => {
          alert('Error al eliminar el evento');
        }
      });
    }
  }

  async openEditEventModal(event: any) {
    const modal = await this.modalController.create({
      component: CreateEventFormComponent,
      componentProps: { event, mode: 'edit' }
    });
    await modal.present();
    const { data, role } = await modal.onWillDismiss();
    if (role === 'edited' && data) {
      this.loadEvents();
    }
  }

  async openEditMissionModal(mission: any) {
    const modal = await this.modalController.create({
      component: CreateEventFormComponent,
      componentProps: { mission, mode: 'edit-mission' }
    });
    await modal.present();
    const { data, role } = await modal.onWillDismiss();
    if (role === 'edited' && data) {
      this.loadEvents();
    }
  }

  async openEditOptions(event: any) {
    const actionSheet = await this.actionSheetController.create({
      header: '¿Qué deseas editar?',
      buttons: [
        {
          text: 'Evento',
          icon: 'calendar-outline',
          handler: () => this.openEditEventModal(event)
        },
        {
          text: 'Misión',
          icon: 'rocket-outline',
          handler: () => this.openEditMissionModal(event.mission)
        },
        {
          text: 'Cancelar',
          icon: 'close',
          role: 'cancel'
        }
      ]
    });
    await actionSheet.present();
  }
}
