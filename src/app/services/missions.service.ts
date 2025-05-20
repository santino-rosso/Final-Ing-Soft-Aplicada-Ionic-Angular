import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, of, throwError } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { Network } from '@capacitor/network';

@Injectable({
  providedIn: 'root'
})
export class MissionsService {
  private apiUrl = environment.url;
  private isConnected = true;
  private offlineQueue: { action: string; data: any; id?: number; filter?: string }[] = [];

  constructor(private http: HttpClient) {
    // Inicializar la monitorización del estado de la red
    this.initNetworkMonitoring();
    // Cargar la cola sin conexión desde localStorage si existe
    const savedQueue = localStorage.getItem('missionOfflineQueue');
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
      console.error('Error al guardar en el localStorage:', error);
    }
  }

  private getFromLocalStorage(key: string): any {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error al recuperar desde localStorage:', error);
      return null;
    }
  }

  private addToOfflineQueue(action: string, data: any, id?: number, filter?: string) {
    this.offlineQueue.push({ action, data, id, filter });
    this.saveToLocalStorage('missionOfflineQueue', this.offlineQueue);
  }

  private async processOfflineQueue() {
    if (this.offlineQueue.length === 0) return;

    const queue = [...this.offlineQueue];
    this.offlineQueue = [];
    
    for (const item of queue) {
      try {
        switch (item.action) {
          case 'create':
            await this.createMission(item.data, false).toPromise();
            break;
          case 'update':
            if (item.id) await this.updateMission(item.id, item.data, false).toPromise();
            break;
          case 'delete':
            if (item.id) await this.deleteMission(item.id, false).toPromise();
            break;
        }
      } catch (error) {
        // Si la operación falla, se agréga de nuevo a la cola
        this.addToOfflineQueue(item.action, item.data, item.id, item.filter);
      }
    }
    
    // Actualizar localStorage
    if (this.offlineQueue.length > 0) {
      this.saveToLocalStorage('missionOfflineQueue', this.offlineQueue);
    } else {
      localStorage.removeItem('missionOfflineQueue');
    }
    
    // Actualizar misiones después de procesar la cola
    this.getMissions().subscribe();
  }

  getMissions(filter?: string): Observable<any[]> {
    const cacheKey = filter ? `missions_${filter}` : 'missions';
    
    if (this.isConnected) {
      let url = `${this.apiUrl}/missions`;
      if (filter) {
        url += `?filter=${filter}`;
      }
      
      return this.http.get<any[]>(url, { headers: this.getHeaders() })
        .pipe(
          tap((missions: any[]) => {
            this.saveToLocalStorage(cacheKey, missions);
          }),
          catchError(error => {
            console.error('Error al obtener misiones al usar datos en localStorage', error);
            const cachedMissions = this.getFromLocalStorage(cacheKey);
            return cachedMissions ? of(cachedMissions) : throwError(() => error);
          })
        );
    } else {
      // Devuelve las misiones guardadas en localStorage cuando está sin conexión
      const cachedMissions = this.getFromLocalStorage(cacheKey);
      return cachedMissions ? of(cachedMissions) : of([]);
    }
  }

  createMission(mission: any, addToQueueIfOffline = true): Observable<any> {
    if (this.isConnected) {
      return this.http.post(`${this.apiUrl}/missions`, mission, { headers: this.getHeaders() })
        .pipe(
          tap((createdMission: any) => {
            // Actualizar misiones guardadas en localStorage
            const cachedMissions = this.getFromLocalStorage('missions') || [];
            cachedMissions.push(createdMission);
            this.saveToLocalStorage('missions', cachedMissions);
            
            // Actualice los cachés filtrados si es necesario
            const freeMissions = this.getFromLocalStorage('missions_spaceevent-is-null') || [];
            freeMissions.push(createdMission);
            this.saveToLocalStorage('missions_spaceevent-is-null', freeMissions);
          })
        );
    } else if (addToQueueIfOffline) {
      // Agregar ID temporal para referencia en localStorage
      const tempMission = { ...mission, id: 'temp_' + Date.now() };
      
      // Actualiza el localStorage
      const cachedMissions = this.getFromLocalStorage('missions') || [];
      cachedMissions.push(tempMission);
      this.saveToLocalStorage('missions', cachedMissions);
      
      const freeMissions = this.getFromLocalStorage('missions_spaceevent-is-null') || [];
      freeMissions.push(tempMission);
      this.saveToLocalStorage('missions_spaceevent-is-null', freeMissions);
      
      // Agregar a la cola sin conexión
      this.addToOfflineQueue('create', mission);
      
      return of(tempMission);
    }
    
    return throwError(() => new Error('Red no disponible y operación no en cola'));
  }

  updateMission(missionId: number, mission: any, addToQueueIfOffline = true): Observable<any> {
    if (this.isConnected) {
      return this.http.put(`${this.apiUrl}/missions/${missionId}`, mission, { headers: this.getHeaders() })
        .pipe(
          tap((updatedMission: any) => {
            // Actualizar misiones almacenadas en localStorage
            this.updateMissionInCache('missions', missionId, updatedMission);
            this.updateMissionInCache('missions_spaceevent-is-null', missionId, updatedMission);
          })
        );
    } else if (addToQueueIfOffline) {
      const missionWithId = { ...mission, id: missionId };
      
      // Actualiza el localStorage
      this.updateMissionInCache('missions', missionId, missionWithId);
      this.updateMissionInCache('missions_spaceevent-is-null', missionId, missionWithId);
      
      // Agrega a la cola sin conexión
      this.addToOfflineQueue('update', mission, missionId);
      
      return of(missionWithId);
    }
    
    return throwError(() => new Error('Red no disponible y operación no en cola'));
  }

  deleteMission(missionId: number, addToQueueIfOffline = true): Observable<any> {
    if (this.isConnected) {
      return this.http.delete(`${this.apiUrl}/missions/${missionId}`, { headers: this.getHeaders() })
        .pipe(
          tap(() => {
            // Actualizar misiones almacenadas en localStorage
            this.removeMissionFromCache('missions', missionId);
            this.removeMissionFromCache('missions_spaceevent-is-null', missionId);
          })
        );
    } else if (addToQueueIfOffline) {
      // Actualiza el localStorage
      this.removeMissionFromCache('missions', missionId);
      this.removeMissionFromCache('missions_spaceevent-is-null', missionId);
      
      // Añade a la cola sin conexión
      this.addToOfflineQueue('delete', {}, missionId);
      
      return of({});
    }
    
    return throwError(() => new Error('Red no disponible y operación no en cola'));
  }

  private updateMissionInCache(cacheKey: string, missionId: number, updatedMission: any) {
    const cache = this.getFromLocalStorage(cacheKey) || [];
    const index = cache.findIndex((m: any) => m.id === missionId);
    if (index !== -1) {
      cache[index] = updatedMission;
      this.saveToLocalStorage(cacheKey, cache);
    }
  }

  private removeMissionFromCache(cacheKey: string, missionId: number) {
    const cache = this.getFromLocalStorage(cacheKey) || [];
    const filteredCache = cache.filter((m: any) => m.id !== missionId);
    this.saveToLocalStorage(cacheKey, filteredCache);
  }

  // Método para sincronizar datos manualmente
  syncData(): Observable<boolean> {
    if (this.isConnected) {
      this.processOfflineQueue();
      return this.getMissions().pipe(
        map(() => true),
        catchError(() => of(false))
      );
    }
    return of(false);
  }
}