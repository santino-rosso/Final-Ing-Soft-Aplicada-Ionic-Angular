import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, of, throwError } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { Network } from '@capacitor/network';

@Injectable({
  providedIn: 'root'
})
export class SpaceEventsService {
  private apiUrl = environment.url;
  private isConnected = true;
  private offlineQueue: { action: string; data: any; id?: number }[] = [];

  constructor(private http: HttpClient) {
    // Inicializar la monitorización del estado de la red
    this.initNetworkMonitoring();
    // Cargar la cola sin conexión desde localStorage si existe
    const savedQueue = localStorage.getItem('offlineQueue');
    if (savedQueue) {
      this.offlineQueue = JSON.parse(savedQueue);
    }
  }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Bearer ${localStorage.getItem('jwt')}`
    });
  }

  private async initNetworkMonitoring() {
    // Obtener el estado inicial de la red
    const status = await Network.getStatus();
    this.isConnected = status.connected;

    // Detector de cambios del estado de la red
    Network.addListener('networkStatusChange', status => {
      this.isConnected = status.connected;
      
      // Si se restablece la conexión, procesa la cola sin conexión
      if (this.isConnected) {
        this.processOfflineQueue();
      }
    });
  }

  private saveToLocalStorage(key: string, data: any) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }

  private getFromLocalStorage(key: string): any {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error retrieving from localStorage:', error);
      return null;
    }
  }

  private addToOfflineQueue(action: string, data: any, id?: number) {
    this.offlineQueue.push({ action, data, id });
    this.saveToLocalStorage('offlineQueue', this.offlineQueue);
  }

  private async processOfflineQueue() {
    if (this.offlineQueue.length === 0) return;

    const queue = [...this.offlineQueue];
    this.offlineQueue = [];
    
    for (const item of queue) {
      try {
        switch (item.action) {
          case 'create':
            await this.createEvent(item.data, false).toPromise();
            break;
          case 'update':
            if (item.id) await this.updateEvent(item.id, item.data, false).toPromise();
            break;
          case 'delete':
            if (item.id) await this.deleteEvent(item.id, false).toPromise();
            break;
        }
      } catch (error) {
        // Si la operación falla, se agréga de nuevo a la cola
        this.addToOfflineQueue(item.action, item.data, item.id);
      }
    }
    
    // Actualizar localStorage
    if (this.offlineQueue.length > 0) {
      this.saveToLocalStorage('offlineQueue', this.offlineQueue);
    } else {
      localStorage.removeItem('offlineQueue');
    }
    
    // Actualizar eventos después de procesar la cola
    this.getSpaceEvents().subscribe();
  }

  getSpaceEvents(): Observable<any[]> {
    if (this.isConnected) {
      return this.http.get<any[]>(`${this.apiUrl}/space-events`, { headers: this.getHeaders() })
        .pipe(
          tap((events: any[]) => {
            this.saveToLocalStorage('spaceEvents', events);
          }),
          catchError(error => {
            console.error('Error al obtener eventos al usar datos en localStorage', error);
            const cachedEvents = this.getFromLocalStorage('spaceEvents');
            return cachedEvents ? of(cachedEvents) : throwError(() => error);
          })
        );
    } else {
      // Devuelve los eventos guardadas en localStorage cuando está sin conexión
      const cachedEvents = this.getFromLocalStorage('spaceEvents') || [];
      return of(cachedEvents);
    }
  }

  createEvent(event: any, addToQueueIfOffline = true): Observable<any> {
    if (this.isConnected) {
      return this.http.post(`${this.apiUrl}/space-events`, event, { headers: this.getHeaders() })
        .pipe(
          tap((createdEvent: any) => {
            // Actualizar eventos guardadas en localStorage
            const cachedEvents = this.getFromLocalStorage('spaceEvents') || [];
            cachedEvents.push(createdEvent);
            this.saveToLocalStorage('spaceEvents', cachedEvents);
          })
        );
    } else if (addToQueueIfOffline) {
      // Agregar ID temporal para referencia en localStorage
      const tempEvent = { ...event, id: 'temp_' + Date.now() };
      
      // Actualiza el localStorage
      const cachedEvents = this.getFromLocalStorage('spaceEvents') || [];
      cachedEvents.push(tempEvent);
      this.saveToLocalStorage('spaceEvents', cachedEvents);
      
      // Agregar a la cola sin conexión
      this.addToOfflineQueue('create', event);
      
      return of(tempEvent);
    }
    
    return throwError(() => new Error('Red no disponible y operación no en cola'));
  }

  updateEvent(eventId: number, event: any, addToQueueIfOffline = true): Observable<any> {
    if (this.isConnected) {
      return this.http.put(`${this.apiUrl}/space-events/${eventId}`, event, { headers: this.getHeaders() })
        .pipe(
          tap((updatedEvent: any) => {
            // Actualizar eventos almacenadas en localStorage
            const cachedEvents = this.getFromLocalStorage('spaceEvents') || [];
            const index = cachedEvents.findIndex((e: any) => e.id === eventId);
            if (index !== -1) {
              cachedEvents[index] = updatedEvent;
              this.saveToLocalStorage('spaceEvents', cachedEvents);
            }
          })
        );
    } else if (addToQueueIfOffline) {
      // Actualiza el localStorage
      const cachedEvents = this.getFromLocalStorage('spaceEvents') || [];
      const index = cachedEvents.findIndex((e: any) => e.id === eventId);
      if (index !== -1) {
        cachedEvents[index] = { ...event, id: eventId };
        this.saveToLocalStorage('spaceEvents', cachedEvents);
      }
      
      // Agrega a la cola sin conexión
      this.addToOfflineQueue('update', event, eventId);
      
      return of({ ...event, id: eventId });
    }
    
    return throwError(() => new Error('Red no disponible y operación no en cola'));
  }

  deleteEvent(eventId: number, addToQueueIfOffline = true): Observable<any> {
    if (this.isConnected) {
      return this.http.delete(`${this.apiUrl}/space-events/${eventId}`, { headers: this.getHeaders() })
        .pipe(
          tap(() => {
            // Actualizar eventos almacenadas en localStorage
            const cachedEvents = this.getFromLocalStorage('spaceEvents') || [];
            const filteredEvents = cachedEvents.filter((e: any) => e.id !== eventId);
            this.saveToLocalStorage('spaceEvents', filteredEvents);
          })
        );
    } else if (addToQueueIfOffline) {
      // Actualiza el localStorage
      const cachedEvents = this.getFromLocalStorage('spaceEvents') || [];
      const filteredEvents = cachedEvents.filter((e: any) => e.id !== eventId);
      this.saveToLocalStorage('spaceEvents', filteredEvents);
      
      // Añade a la cola sin conexión
      this.addToOfflineQueue('delete', {}, eventId);
      
      return of({});
    }
    
    return throwError(() => new Error('Red no disponible y operación no en cola'));
  }

  // Método para sincronizar datos manualmente
  syncData(): Observable<boolean> {
    if (this.isConnected) {
      this.processOfflineQueue();
      return this.getSpaceEvents().pipe(
        map(() => true),
        catchError(() => of(false))
      );
    }
    return of(false);
  }
}