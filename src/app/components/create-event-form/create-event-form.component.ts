import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SpaceEventsService } from 'src/app/services/space-events.service';
import { MissionsService } from 'src/app/services/missions.service';
import { IonicModule } from '@ionic/angular';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';


@Component({
  selector: 'app-create-event-form',
  templateUrl: './create-event-form.component.html',
  styleUrls: ['./create-event-form.component.scss'],
  standalone: true,
  imports: [
    IonicModule,
    ReactiveFormsModule,
    CommonModule
  ],
})
export class CreateEventFormComponent implements OnInit {
  @Input() event: any = null;
  @Input() mission: any = null;
  @Input() mode: 'edit' | 'edit-mission' | undefined;

  step: 'mission' | 'event' = 'mission';
  missionForm: FormGroup;
  eventForm: FormGroup;
  createdMission: any = null;
  missionsAvailable: any[] = [];

  constructor(
    private modalCtrl: ModalController,
    private fb: FormBuilder,
    private spaceEventsService: SpaceEventsService,
    private missionsService: MissionsService
  ) {
    this.missionForm = this.fb.group({
      name: ['', Validators.required],
      description: ['', Validators.required],
    });

    this.eventForm = this.fb.group({
      name: ['', Validators.required],
      date: ['', Validators.required],
      description: ['', Validators.required],
      photo: [''],
      photoContentType: [''],
      type: ['', Validators.required],
    });
  }

  ngOnInit() {
    // Si es edición de evento
    if (this.mode === 'edit' && this.event) {
      this.step = 'event';
      this.eventForm.patchValue({
        name: this.event.name,
        date: this.event.date,
        description: this.event.description,
        photo: this.event.photo,
        photoContentType: this.event.photoContentType,
        type: this.event.type,
      });
      this.createdMission = this.event.mission;

      // 1. Cargar misiones no asociadas a eventos
      this.missionsService.getMissions('spaceevent-is-null').subscribe(missions => {
        // 2. Agregar la misión actualmente asociada 
        if (
          this.event.mission &&
          !missions.some(m => m.id === this.event.mission.id)
        ) {
          missions.push(this.event.mission);
        }
        this.missionsAvailable = missions;
      });
    }
    // Si es edición de misión
    if (this.mode === 'edit-mission' && this.mission) {
      this.step = 'mission';
      this.missionForm.patchValue({
        name: this.mission.name,
        description: this.mission.description,
      });
      this.createdMission = this.mission;
    }
  }

  async createMission() {
    if (this.missionForm.invalid) return;
    if (this.mode === 'edit-mission' && this.mission) {
      const missionData = {
        id: this.mission.id,
        ...this.missionForm.value
      };
      // Actualizar misión
      this.missionsService.updateMission(this.mission.id, missionData).subscribe({
        next: (mission) => {
          this.modalCtrl.dismiss({ mission }, 'edited');
        },
        error: () => alert('Error al actualizar la misión')
      });
    } else {
      // Crear misión
      this.missionsService.createMission(this.missionForm.value).subscribe({
        next: (mission) => {
          this.createdMission = mission;
          this.step = 'event';
          // Recargar misiones disponibles y seleccionar la nueva
          this.missionsService.getMissions('spaceevent-is-null').subscribe(missions => {
            // Agregar la nueva misión
            if (!missions.some(m => m.id === mission.id)) {
              missions.push(mission);
            }
            this.missionsAvailable = missions;
            // Seleccionar la nueva misión en el select
            setTimeout(() => {
              this.createdMission = mission;
            });
          });
        },
        error: () => alert('Error al crear la misión')
      });
    }
  }

  async createEvent() {
    if (this.eventForm.invalid) return;
    let eventData = {
      ...this.eventForm.value,
      mission: this.createdMission
    };
    if (this.mode === 'edit' && this.event) {
      // Actualizar evento
      eventData = {
        id: this.event.id,
        ...eventData
      };
      this.spaceEventsService.updateEvent(this.event.id, eventData).subscribe({
        next: (event) => {
          this.modalCtrl.dismiss({ event }, 'edited');
        },
        error: () => alert('Error al actualizar el evento')
      });
    } else {
      // Crear evento
      this.spaceEventsService.createEvent(eventData).subscribe({
        next: (event) => {
          this.modalCtrl.dismiss({ event }, 'created');
        },
        error: () => alert('Error al crear el evento')
      });
    }
  }

  close() {
    this.modalCtrl.dismiss();
  }

  onFileChange(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        this.eventForm.patchValue({
          photo: base64,
          photoContentType: file.type
        });
      };
      reader.readAsDataURL(file);
    }
  }

  onMissionChange(event: any) {
    const missionId = event.detail.value;
    if (missionId === '__new__') {
      this.step = 'mission';
      this.missionForm.reset();
      this.createdMission = null;
    } else {
      const selected = this.missionsAvailable.find(m => m.id === missionId);
      if (selected) {
        this.createdMission = selected;
      }
    }
  }
}


