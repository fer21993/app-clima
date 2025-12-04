// auth.service.ts
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

interface User {
  email: string;
  password: string;
  fullname: string;
  role: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  
  private users: User[] = [
    {
      email: 'fernanda@appclima.com',
      password: 'fernanda123',
      fullname: 'Fernanda Martinez',
      role: 'admin'
    },
    {
      email: 'usuario@appclima.com',
      password: 'usuario123',
      fullname: 'Usuario',
      role: 'user'
    }
  ];

  constructor(private router: Router) {}

  login(email: string, password: string): boolean {
    const user = this.users.find(
      u => u.email === email && u.password === password
    );

    if (user) {
      const userData = {
        email: user.email,
        fullname: user.fullname,
        role: user.role
      };
      
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('token', this.generateToken());
      localStorage.setItem('isLoggedIn', 'true');
      
      return true;
    }
    
    return false;
  }

  logout(): void {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('isLoggedIn');
    this.router.navigate(['/login']);
  }

  isAuthenticated(): boolean {
    return localStorage.getItem('isLoggedIn') === 'true' && 
           localStorage.getItem('token') !== null;
  }

  getCurrentUser(): any {
    const userData = localStorage.getItem('user');
    return userData ? JSON.parse(userData) : null;
  }

  private generateToken(): string {
    return 'token_' + Math.random().toString(36).substr(2, 9);
  }
}