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
  
  // Gráficas
  chartDataTemp: any;
  chartDataHum: any;
  chartOptions: any;
  
  // Usuario
  usuario: any = null;
  
  // Control
  private intervalo: any;
  private ultimoTimestamp: string = '';
  
  // Contador regresivo SINCRONIZADO
  nextReadingIn: number = 0;
  private countdownInterval: any;
  private timestampInicio: number = 0;
  
  private apiUrl = 'https://servidor-esp.onrender.com/api/data';
  private statsUrl = 'https://servidor-esp.onrender.com/api/stats';

  constructor(
    private http: HttpClient,
    private messageService: MessageService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const userData = localStorage.getItem('user');
    if (userData) {
      this.usuario = JSON.parse(userData);
    }
    
    this.configurarGraficas();
    this.cargarDatos();
    this.cargarEstadisticas();
    
    // Polling cada 2 segundos
    this.intervalo = setInterval(() => {
      this.verificarNuevosDatos();
    }, 2000);
  }

  ngOnDestroy(): void {
    if (this.intervalo) {
      clearInterval(this.intervalo);
    }
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }

  // Iniciar contador con el valor que viene del ESP32
  iniciarContadorDesdeDato(segundos: number) {
    console.log(`⏰ INICIANDO CONTADOR: ${segundos} segundos`);
    this.nextReadingIn = segundos;
    this.timestampInicio = Date.now();
    
    // Limpiar intervalo anterior si existe
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
    
    // Actualizar cada segundo
    this.countdownInterval = setInterval(() => {
      const transcurrido = Math.floor((Date.now() - this.timestampInicio) / 1000);
      const restante = segundos - transcurrido;
      
      if (restante > 0) {
        this.nextReadingIn = restante;
        console.log(`⏳ Contador: ${this.nextReadingIn}s`);
      } else {
        this.nextReadingIn = 0;
        console.log('⏰ Contador llegó a 0, esperando nuevo dato...');
      }
    }, 1000);
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

  verificarNuevosDatos() {
    this.http.get<any[]>(this.apiUrl, { headers: this.getHeaders() }).subscribe({
      next: (res) => {
        if (res && res.length > 0) {
          const ultimoDato = res[0];
          
          if (ultimoDato.timestamp !== this.ultimoTimestamp) {
            console.log('🆕 NUEVO DATO DETECTADO:', ultimoDato.timestamp);
            console.log('📦 Dato completo:', ultimoDato);
            
            this.ultimoTimestamp = ultimoDato.timestamp;
            this.actualizarDatos(res);
            this.cargarEstadisticas();
            
            // SINCRONIZAR contador con el valor que envió el ESP32
            if (ultimoDato.next_reading_in !== undefined && ultimoDato.next_reading_in !== null && ultimoDato.next_reading_in > 0) {
              console.log(`✅ ESP32 envió next_reading_in: ${ultimoDato.next_reading_in}s`);
              this.iniciarContadorDesdeDato(ultimoDato.next_reading_in);
            } else {
              console.warn('⚠️ ESP32 NO envió next_reading_in válido:', ultimoDato.next_reading_in);
              console.warn('🔍 Claves del objeto:', Object.keys(ultimoDato));
              // Fallback: usar 30s por defecto
              this.iniciarContadorDesdeDato(30);
            }
            
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
        console.error('❌ Error al obtener datos:', err);
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
          console.log('📥 Datos iniciales cargados:', res[0]);
          this.ultimoTimestamp = res[0].timestamp;
          this.actualizarDatos(res);
          
          // Iniciar contador con el último dato guardado
          if (res[0].next_reading_in && res[0].next_reading_in > 0) {
            console.log(`🚀 Iniciando con next_reading_in: ${res[0].next_reading_in}s`);
            this.iniciarContadorDesdeDato(res[0].next_reading_in);
          } else {
            console.warn('⚠️ Dato inicial sin next_reading_in');
          }
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
    const datosValidos = datos.filter(d => d.temperature > -90 && d.humidity > -90);
    
    if (ultimo.temperature === -99) {
      const ultimoValido = datosValidos[0];
      if (ultimoValido) {
        this.temperatura = ultimoValido.temperature;
        this.humedad = ultimoValido.humidity;
        this.voltaje = ultimoValido.voltage.toFixed(2);
        this.online = false;
      }
    } else {
      this.temperatura = ultimo.temperature;
      this.humedad = ultimo.humidity;
      this.voltaje = ultimo.voltage.toFixed(2);
      this.online = true;
    }
    
    this.ultimaActualizacion = this.formatearFecha(ultimo.timestamp);
    this.totalLecturas = datos.length;
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