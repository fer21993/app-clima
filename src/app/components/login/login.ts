import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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

  login() {
    if (this.email && this.password) {
      localStorage.setItem('isLoggedIn', 'true');
      window.location.href = '/dashboard';
    }
  }
}