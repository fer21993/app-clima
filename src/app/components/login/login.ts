import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent {
  email = '';
  password = '';
  errorMessage = '';
  isLoading = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
    }
  }

  login() {
    this.errorMessage = '';
    
    if (!this.email || !this.password) {
      this.errorMessage = 'Por favor completa todos los campos';
      return;
    }

    this.isLoading = true;

    setTimeout(() => {
      const success = this.authService.login(this.email, this.password);
      
      if (success) {
        this.router.navigate(['/dashboard']);
      } else {
        this.errorMessage = 'Credenciales incorrectas';
        this.isLoading = false;
      }
    }, 500);
  }

  fillDemo(userType: 'admin' | 'user') {
    if (userType === 'admin') {
      this.email = 'fernanda@appclima.com';
      this.password = 'fernanda123';
    } else {
      this.email = 'usuario@appclima.com';
      this.password = 'usuario123';
    }
  }
}