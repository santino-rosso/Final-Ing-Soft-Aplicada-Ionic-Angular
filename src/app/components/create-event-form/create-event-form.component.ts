import { Component } from '@angular/core';
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
export class CreateEventFormComponent {
  step: 'mission' | 'event' = 'mission';
  missionForm: FormGroup;
  eventForm: FormGroup;
  createdMission: any = null;

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

  async createMission() {
    if (this.missionForm.invalid) return;
    this.missionsService.createMission(this.missionForm.value).subscribe({
      next: (mission) => {
        this.createdMission = mission;
        this.step = 'event';
      },
      error: (err) => {
        // Manejo de error
        alert('Error al crear la misión');
      }
    });
  }

  async createEvent() {
    if (this.eventForm.invalid) return;
    const eventData = {
      ...this.eventForm.value,
      mission: this.createdMission
    };
    this.spaceEventsService.createEvent(eventData).subscribe({
      next: (event) => {
        this.modalCtrl.dismiss({ event }, 'created');
      },
      error: (err) => {
        alert('Error al crear el evento');
      }
    });
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
}


