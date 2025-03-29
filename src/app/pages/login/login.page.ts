import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { IonicModule } from '@ionic/angular';
import { UserService } from 'src/app/services/user.service';
import { Router } from '@angular/router';
import { catchError, of, tap } from 'rxjs';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, IonicModule]
})
export class LoginPage implements OnInit {
  username: string = '';
  password: string = '';
  rememberMe: boolean = false;
  showError: boolean = false;
  errorMessage: string = '';

  constructor(private userService: UserService, private router: Router) {}

  ngOnInit() {
  }

  login() {
    this.userService.login(this.username, this.password, this.rememberMe).pipe(
      tap(response => {
        if (response.id_token) {
          console.log("Autenticación exitosa");
          localStorage.setItem('jwt', response.id_token);
          this.router.navigate(['/home']);
        }
      }),
      catchError(error => {
        console.error('Error en la autenticación', error);
        this.errorMessage = "Credenciales incorectas";
        this.showError = true;
        return of(null);
      })
    ).subscribe();
  }

  navigateToRegister() {
    this.router.navigate(['/register']);
  }
}
