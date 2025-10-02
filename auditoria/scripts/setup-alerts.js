#!/usr/bin/env node

/**
 * SmartEdify Audit Alerts Setup
 * Configura alertas automáticas para cambios críticos en servicios
 * 
 * Uso: node setup-alerts.js [--config alerts-config.json] [--test]
 */

const fs = require('fs');
const path = require('path');
const { generateAlerts, SERVICES_CONFIG } = require('./generate-metrics');

// Configuración de alertas
const ALERTS_CONFIG = {
  // Umbrales de alertas
  thresholds: {
    critical: {
      completeness: 50,
      healthScore: 40,
      criticalIssues: 3
    },
    warning: {
      completeness: 80,
      healthScore: 70,
      criticalIssues: 1
    }
  },
  
  // Canales de notificación
  channels: {
    email: {
      enabled: true,
      recipients: [
        'dev-team@smartedify.com',
        'ops-team@smartedify.com'
      ],
      smtp: {
        host: 'smtp.smartedify.com',
        port: 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER || 'alerts@smartedify.com',
          pass: process.env.SMTP_PASS || 'your-password'
        }
      }
    },
    slack: {
      enabled: true,
      webhook: process.env.SLACK_WEBHOOK || 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK',
      channel: '#smartedify-alerts',
      username: 'SmartEdify Audit Bot'
    },
    webhook: {
      enabled: false,
      url: process.env.WEBHOOK_URL || 'https://api.smartedify.com/alerts',
      headers: {
        'Authorization': `Bearer ${process.env.API_TOKEN || 'your-token'}`,
        'Content-Type': 'application/json'
      }
    }
  },
  
  // Configuración de frecuencia
  schedule: {
    immediate: true,      // Alertas inmediatas para críticos
    hourly: true,         // Resumen cada hora
    daily: true,          // Reporte diario
    weekly: true          // Análisis semanal
  },
  
  // Filtros de alertas
  filters: {
    suppressDuplicates: true,
    suppressDuration: 3600000, // 1 hora en ms
    onlyBusinessHours: false,
    businessHours: {
      start: 9,
      end: 18,
      timezone: 'America/Lima'
    }
  }
};

/**
 * Clase para gestionar alertas
 */
class AlertManager {
  constructor(config = ALERTS_CONFIG) {
    this.config = config;
    this.alertHistory = new Map();
    this.loadAlertHistory();
  }
  
  /**
   * Carga historial de alertas
   */
  loadAlertHistory() {
    const historyFile = path.join(__dirname, '..', 'history', 'alert-history.json');
    if (fs.existsSync(historyFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
        this.alertHistory = new Map(data);
      } catch (error) {
        console.warn('⚠️ No se pudo cargar historial de alertas:', error.message);
      }
    }
  }
  
  /**
   * Guarda historial de alertas
   */
  saveAlertHistory() {
    const historyDir = path.join(__dirname, '..', 'history');
    if (!fs.existsSync(historyDir)) {
      fs.mkdirSync(historyDir, { recursive: true });
    }
    
    const historyFile = path.join(historyDir, 'alert-history.json');
    fs.writeFileSync(historyFile, JSON.stringify([...this.alertHistory], null, 2));
  }
  
  /**
   * Verifica si una alerta debe ser suprimida
   */
  shouldSuppressAlert(alertKey, alert) {
    if (!this.config.filters.suppressDuplicates) return false;
    
    const lastAlert = this.alertHistory.get(alertKey);
    if (!lastAlert) return false;
    
    const timeDiff = Date.now() - lastAlert.timestamp;
    return timeDiff < this.config.filters.suppressDuration;
  }
  
  /**
   * Verifica si estamos en horario de negocio
   */
  isBusinessHours() {
    if (!this.config.filters.onlyBusinessHours) return true;
    
    const now = new Date();
    const hour = now.getHours();
    return hour >= this.config.schedule.businessHours.start && 
           hour < this.config.schedule.businessHours.end;
  }
  
  /**
   * Procesa alertas generadas
   */
  async processAlerts() {
    console.log('🔍 Procesando alertas...');
    
    const alerts = generateAlerts();
    const processedAlerts = [];
    
    for (const alert of alerts) {
      const alertKey = `${alert.service}-${alert.level}`;
      
      // Verificar supresión
      if (this.shouldSuppressAlert(alertKey, alert)) {
        console.log(`🔇 Alerta suprimida: ${alertKey}`);
        continue;
      }
      
      // Verificar horario de negocio
      if (!this.isBusinessHours() && alert.level !== 'CRITICAL') {
        console.log(`⏰ Alerta diferida (fuera de horario): ${alertKey}`);
        continue;
      }
      
      // Procesar alerta
      await this.sendAlert(alert);
      
      // Guardar en historial
      this.alertHistory.set(alertKey, {
        ...alert,
        timestamp: Date.now(),
        sent: true
      });
      
      processedAlerts.push(alert);
    }
    
    this.saveAlertHistory();
    return processedAlerts;
  }
  
  /**
   * Envía alerta a todos los canales configurados
   */
  async sendAlert(alert) {
    console.log(`📢 Enviando alerta: ${alert.level} - ${alert.service}`);
    
    const promises = [];
    
    if (this.config.channels.email.enabled) {
      promises.push(this.sendEmailAlert(alert));
    }
    
    if (this.config.channels.slack.enabled) {
      promises.push(this.sendSlackAlert(alert));
    }
    
    if (this.config.channels.webhook.enabled) {
      promises.push(this.sendWebhookAlert(alert));
    }
    
    try {
      await Promise.all(promises);
      console.log(`✅ Alerta enviada exitosamente: ${alert.service}`);
    } catch (error) {
      console.error(`❌ Error enviando alerta: ${error.message}`);
    }
  }
  
  /**
   * Envía alerta por email
   */
  async sendEmailAlert(alert) {
    // Simulación de envío de email
    // En producción, usar nodemailer o similar
    console.log(`📧 Email enviado a: ${this.config.channels.email.recipients.join(', ')}`);
    
    const emailContent = this.formatEmailAlert(alert);
    
    // Guardar email para debug
    const emailFile = path.join(__dirname, '..', 'history', `email-${Date.now()}.html`);
    fs.writeFileSync(emailFile, emailContent);
    
    return Promise.resolve();
  }
  
  /**
   * Envía alerta a Slack
   */
  async sendSlackAlert(alert) {
    const slackMessage = this.formatSlackAlert(alert);
    
    // Simulación de envío a Slack
    console.log(`💬 Slack message: ${JSON.stringify(slackMessage, null, 2)}`);
    
    // En producción, hacer POST al webhook de Slack
    /*
    const response = await fetch(this.config.channels.slack.webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(slackMessage)
    });
    */
    
    return Promise.resolve();
  }
  
  /**
   * Envía alerta via webhook
   */
  async sendWebhookAlert(alert) {
    console.log(`🔗 Webhook enviado a: ${this.config.channels.webhook.url}`);
    
    // En producción, hacer POST al webhook
    /*
    const response = await fetch(this.config.channels.webhook.url, {
      method: 'POST',
      headers: this.config.channels.webhook.headers,
      body: JSON.stringify(alert)
    });
    */
    
    return Promise.resolve();
  }
  
  /**
   * Formatea alerta para email
   */
  formatEmailAlert(alert) {
    const levelColor = alert.level === 'CRITICAL' ? '#ff4444' : '#ffaa00';
    const levelEmoji = alert.level === 'CRITICAL' ? '🔴' : '🟡';
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>SmartEdify Alert: ${alert.service}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .alert { border-left: 4px solid ${levelColor}; padding: 15px; background: #f9f9f9; }
        .level { color: ${levelColor}; font-weight: bold; }
        .service { font-size: 18px; font-weight: bold; margin-bottom: 10px; }
        .details { margin: 10px 0; }
        .issues { background: #fff; padding: 10px; border-radius: 4px; }
        .footer { margin-top: 20px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="alert">
        <div class="service">${levelEmoji} ${alert.service}</div>
        <div class="level">Nivel: ${alert.level}</div>
        <div class="details">
            <strong>Mensaje:</strong> ${alert.message}<br>
            <strong>Completitud:</strong> ${alert.completeness}%<br>
            <strong>Timestamp:</strong> ${new Date().toLocaleString()}
        </div>
        ${alert.issues.length > 0 ? `
        <div class="issues">
            <strong>Issues Críticos:</strong>
            <ul>
                ${alert.issues.map(issue => `<li>${issue}</li>`).join('')}
            </ul>
        </div>
        ` : ''}
    </div>
    <div class="footer">
        SmartEdify Audit System - Generado automáticamente
    </div>
</body>
</html>`;
  }
  
  /**
   * Formatea alerta para Slack
   */
  formatSlackAlert(alert) {
    const levelColor = alert.level === 'CRITICAL' ? 'danger' : 'warning';
    const levelEmoji = alert.level === 'CRITICAL' ? '🔴' : '🟡';
    
    return {
      channel: this.config.channels.slack.channel,
      username: this.config.channels.slack.username,
      attachments: [{
        color: levelColor,
        title: `${levelEmoji} ${alert.level}: ${alert.service}`,
        text: alert.message,
        fields: [
          {
            title: 'Completitud',
            value: `${alert.completeness}%`,
            short: true
          },
          {
            title: 'Timestamp',
            value: new Date().toLocaleString(),
            short: true
          }
        ],
        footer: 'SmartEdify Audit System'
      }]
    };
  }
  
  /**
   * Genera reporte de resumen
   */
  generateSummaryReport() {
    const alerts = generateAlerts();
    const criticalCount = alerts.filter(a => a.level === 'CRITICAL').length;
    const warningCount = alerts.filter(a => a.level === 'WARNING').length;
    
    return {
      timestamp: new Date().toISOString(),
      summary: {
        total: alerts.length,
        critical: criticalCount,
        warning: warningCount
      },
      alerts: alerts,
      services: Object.keys(SERVICES_CONFIG).length,
      healthyServices: Object.values(SERVICES_CONFIG).filter(s => s.status === 'functional').length
    };
  }
  
  /**
   * Configura alertas programadas
   */
  setupScheduledAlerts() {
    console.log('⏰ Configurando alertas programadas...');
    
    // Alertas inmediatas (cada 5 minutos)
    if (this.config.schedule.immediate) {
      setInterval(() => {
        this.processAlerts();
      }, 5 * 60 * 1000);
    }
    
    // Resumen cada hora
    if (this.config.schedule.hourly) {
      setInterval(() => {
        const report = this.generateSummaryReport();
        console.log('📊 Reporte horario:', JSON.stringify(report.summary, null, 2));
      }, 60 * 60 * 1000);
    }
    
    // Reporte diario (8:00 AM)
    if (this.config.schedule.daily) {
      const now = new Date();
      const tomorrow8AM = new Date(now);
      tomorrow8AM.setDate(tomorrow8AM.getDate() + 1);
      tomorrow8AM.setHours(8, 0, 0, 0);
      
      const msUntil8AM = tomorrow8AM.getTime() - now.getTime();
      
      setTimeout(() => {
        this.sendDailyReport();
        setInterval(() => {
          this.sendDailyReport();
        }, 24 * 60 * 60 * 1000);
      }, msUntil8AM);
    }
    
    console.log('✅ Alertas programadas configuradas');
  }
  
  /**
   * Envía reporte diario
   */
  async sendDailyReport() {
    console.log('📅 Enviando reporte diario...');
    
    const report = this.generateSummaryReport();
    
    // Crear alerta especial para reporte diario
    const dailyAlert = {
      level: 'INFO',
      service: 'audit-system',
      message: `Reporte diario: ${report.summary.total} alertas activas`,
      completeness: Math.round(report.healthyServices / report.services * 100),
      issues: [`${report.summary.critical} críticas, ${report.summary.warning} advertencias`]
    };
    
    await this.sendAlert(dailyAlert);
  }
}

/**
 * Función principal
 */
async function main() {
  const args = process.argv.slice(2);
  const isTest = args.includes('--test');
  const configFile = args.includes('--config') ? args[args.indexOf('--config') + 1] : null;
  
  console.log('🚨 Configurando sistema de alertas SmartEdify...');
  
  let config = ALERTS_CONFIG;
  if (configFile && fs.existsSync(configFile)) {
    config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
    console.log(`📋 Configuración cargada desde: ${configFile}`);
  }
  
  const alertManager = new AlertManager(config);
  
  if (isTest) {
    console.log('🧪 Modo de prueba activado');
    
    // Procesar alertas una vez
    const processedAlerts = await alertManager.processAlerts();
    console.log(`✅ Procesadas ${processedAlerts.length} alertas en modo de prueba`);
    
    // Generar reporte de resumen
    const report = alertManager.generateSummaryReport();
    console.log('📊 Reporte de resumen:', JSON.stringify(report, null, 2));
    
  } else {
    // Procesar alertas inmediatas
    await alertManager.processAlerts();
    
    // Configurar alertas programadas
    alertManager.setupScheduledAlerts();
    
    console.log('🎯 Sistema de alertas activo. Presiona Ctrl+C para detener.');
    
    // Mantener el proceso activo
    process.on('SIGINT', () => {
      console.log('\n👋 Deteniendo sistema de alertas...');
      process.exit(0);
    });
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Error en sistema de alertas:', error);
    process.exit(1);
  });
}

module.exports = { AlertManager, ALERTS_CONFIG };