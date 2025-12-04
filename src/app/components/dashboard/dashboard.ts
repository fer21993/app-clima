// dashboard.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { MessageService } from 'primeng/api';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

// PrimeNG
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    FormsModule,
    CardModule,
    ButtonModule,
    TagModule,
    ToastModule,
    TableModule,
    DialogModule,
    TooltipModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.css'],
  providers: [MessageService]
})
export class DashboardComponent implements OnInit, OnDestroy {
  // Datos actuales
  temperatura: number = 0;
  humedad: number = 0;
  voltaje: string = '--';
  device: string = 'ESP32-de-Fernanda';
  ultimaActualizacion: string = '--';
  online: boolean = false;
  
  // Estadísticas
  promedioTemp: number = 0;
  promedioHum: number = 0;
  maxTemp: number = 0;
  minTemp: number = 0;
  totalLecturas: number = 0;
  
  // Histórico
  historico: any[] = [];
  mostrarHistorico = false;
  
  // Gráficas (últimas 15 lecturas)
  chartDataTemp: any;
  chartDataHum: any;
  chartOptions: any;
  
  // Usuario
  usuario: any = null;
  
  // Control
  private intervalo: any;
  private ultimoTimestamp: string = '';
  
  private apiUrl = 'https://servidor-esp.onrender.com/api/data';
  private statsUrl = 'https://servidor-esp.onrender.com/api/stats';

  constructor(
    private http: HttpClient,
    private messageService: MessageService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Cargar usuario
    const userData = localStorage.getItem('user');
    if (userData) {
      this.usuario = JSON.parse(userData);
    }
    
    this.configurarGraficas();
    this.cargarDatos();
    this.cargarEstadisticas();
    
    // Polling inteligente: revisar cada 2 segundos si hay datos NUEVOS
    this.intervalo = setInterval(() => {
      this.verificarNuevosDatos();
    }, 2000);
  }

  ngOnDestroy(): void {
    if (this.intervalo) {
      clearInterval(this.intervalo);
    }
  }

  getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  configurarGraficas() {
    this.chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        x: {
          display: true,
          grid: { display: false }
        },
        y: {
          display: true,
          grid: { color: 'rgba(0,0,0,0.05)' }
        }
      }
    };
  }

  // 🆕 Verificar si hay datos NUEVOS (solo actualiza si el timestamp cambió)
  verificarNuevosDatos() {
    this.http.get<any[]>(this.apiUrl, { headers: this.getHeaders() }).subscribe({
      next: (res) => {
        if (res && res.length > 0) {
          const ultimoDato = res[0];
          
          // Solo actualizar si el timestamp es diferente
          if (ultimoDato.timestamp !== this.ultimoTimestamp) {
            console.log('🆕 NUEVO DATO DETECTADO:', ultimoDato.timestamp);
            this.ultimoTimestamp = ultimoDato.timestamp;
            this.actualizarDatos(res);
            this.cargarEstadisticas();
            
            // Notificar
            this.messageService.add({
              severity: 'success',
              summary: 'Datos Actualizados',
              detail: `Temp: ${ultimoDato.temperature.toFixed(1)}°C | Hum: ${ultimoDato.humidity.toFixed(1)}%`,
              life: 3000
            });
          }
        }
      },
      error: (err) => {
        if (err.status === 401) {
          this.router.navigate(['/login']);
        }
      }
    });
  }

  cargarDatos() {
    this.http.get<any[]>(this.apiUrl, { headers: this.getHeaders() }).subscribe({
      next: (res) => {
        if (res && res.length > 0) {
          this.ultimoTimestamp = res[0].timestamp;
          this.actualizarDatos(res);
        }
      },
      error: (err) => {
        console.error('Error:', err);
        if (err.status === 401) {
          this.router.navigate(['/login']);
        }
      }
    });
  }

  actualizarDatos(datos: any[]) {
    const ultimo = datos[0];
    
    // Filtrar datos válidos (ignorar -99)
    const datosValidos = datos.filter(d => d.temperature > -90 && d.humidity > -90);
    
    // Si el último dato es -99, mostrar el último válido
    if (ultimo.temperature === -99) {
      const ultimoValido = datosValidos[0];
      if (ultimoValido) {
        this.temperatura = ultimoValido.temperature;
        this.humedad = ultimoValido.humidity;
        this.voltaje = ultimoValido.voltage.toFixed(2);
        this.online = false; // Sensor desconectado
      }
    } else {
      this.temperatura = ultimo.temperature;
      this.humedad = ultimo.humidity;
      this.voltaje = ultimo.voltage.toFixed(2);
      this.online = true;
    }
    
    this.ultimaActualizacion = this.formatearFecha(ultimo.timestamp);
    this.totalLecturas = datos.length;
    
    // Actualizar gráficas con últimos 15 datos válidos
    this.actualizarGraficas(datosValidos.slice(0, 15).reverse());
  }

  actualizarGraficas(datos: any[]) {
    const temperaturas = datos.map(d => d.temperature);
    const humedades = datos.map(d => d.humidity);
    const labels = datos.map(d => {
      const fecha = new Date(d.timestamp);
      return fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    });

    this.chartDataTemp = {
      labels: labels,
      datasets: [{
        data: temperaturas,
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        fill: true,
        tension: 0.4
      }]
    };

    this.chartDataHum = {
      labels: labels,
      datasets: [{
        data: humedades,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4
      }]
    };
  }

  cargarEstadisticas() {
    this.http.get<any>(this.statsUrl, { headers: this.getHeaders() }).subscribe({
      next: (stats) => {
        if (stats.statistics) {
          this.promedioTemp = stats.statistics.avg_temp || 0;
          this.promedioHum = stats.statistics.avg_humidity || 0;
          this.maxTemp = stats.statistics.max_temp || 0;
          this.minTemp = stats.statistics.min_temp || 0;
        }
      },
      error: (err) => console.error('Error stats:', err)
    });
  }

  verHistorico() {
    this.mostrarHistorico = true;
    this.http.get<any[]>(this.apiUrl, { headers: this.getHeaders() }).subscribe({
      next: (res) => {
        this.historico = res.slice(0, 100);
      }
    });
  }

  cerrarHistorico() {
    this.mostrarHistorico = false;
  }

  cerrarSesion() {
    localStorage.clear();
    this.router.navigate(['/login']);
  }

  formatearFecha(timestamp: string): string {
    try {
      return new Date(timestamp).toLocaleString('es-MX');
    } catch {
      return timestamp;
    }
  }
}