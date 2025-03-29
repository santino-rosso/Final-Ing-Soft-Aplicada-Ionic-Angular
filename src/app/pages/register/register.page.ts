import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { UserService } from 'src/app/services/user.service';
import { Router } from '@angular/router';
import { catchError, of, tap } from 'rxjs';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class RegisterPage implements OnInit {
  login: string = '';
  email: string = '';
  langKey: string = 'es';
  password: string = '';
  showError: boolean = false;
  errorMessage: string = '';
  acceptedMessage: string = '';
  showAccepted: boolean = false;
  

  constructor(private userService: UserService, private router: Router) { }

  ngOnInit() {
  }

  register() {
    this.showError = false;
    this.showAccepted = false;

    this.userService.register(this.login, this.email, this.langKey, this.password).pipe(
      tap(response => {
        if (response.status === 201) {
          console.log("Registro exitoso");
          this.acceptedMessage = "Registro exitoso";
          this.showAccepted = true;
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 3000);
        }
      }),
      catchError(error => {
        this.login = '';
        this.email = '';
        this.password = '';
        console.error('Error en el registro', error);
        this.errorMessage = "Error en el registro. Inténtelo de nuevo.";
        this.showError = true;
        return of(null);
      })
    ).subscribe();
  }

  navigateToLogin() {
    this.router.navigate(['/login']);
  }
}