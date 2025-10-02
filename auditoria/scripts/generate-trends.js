#!/usr/bin/env node

/**
 * SmartEdify Audit Trends Generator
 * Analiza tendencias históricas y genera proyecciones de progreso
 * 
 * Uso: node generate-trends.js [--period 7d|30d|90d] [--format json|chart] [--output file]
 */

const fs = require('fs');
const path = require('path');
const { SERVICES_CONFIG } = require('./generate-metrics');

// Configuración de análisis de tendencias
const TRENDS_CONFIG = {
  periods: {
    '7d': { days: 7, label: '7 días' },
    '30d': { days: 30, label: '30 días' },
    '90d': { days: 90, label: '90 días' }
  },
  
  // Factores de proyección
  projectionFactors: {
    'reservation-service': {
      currentRate: -2, // Degradación por falta de mantenimiento
      implementationRate: 15, // Progreso durante reimplementación
      phases: [
        { name: 'Análisis', duration: 3, progress: 5 },
        { name: 'Reimplementación', duration: 14, progress: 60 },
        { name: 'Testing', duration: 7, progress: 25 },
        { name: 'Deployment', duration: 3, progress: 10 }
      ]
    },
    'asset-management-service': {
      currentRate: 1,
      implementationRate: 8,
      phases: [
        { name: 'Mobile Offline', duration: 7, progress: 15 },
        { name: 'Proveedores', duration: 10, progress: 10 },
        { name: 'Optimización', duration: 7, progress: 5 }
      ]
    },
    'governance-service': {
      currentRate: 0.5,
      implementationRate: 3,
      phases: [
        { name: 'Mejoras menores', duration: 7, progress: 5 }
      ]
    }
  }
};

/**
 * Clase para análisis de tendencias
 */
class TrendsAnalyzer {
  constructor() {
    this.historyDir = path.join(__dirname, '..', 'history');
    this.ensureHistoryDir();
  }
  
  /**
   * Asegura que existe el directorio de historial
   */
  ensureHistoryDir() {
    if (!fs.existsSync(this.historyDir)) {
      fs.mkdirSync(this.historyDir, { recursive: true });
    }
  }
  
  /**
   * Carga datos históricos
   */
  loadHistoricalData(period = '30d') {
    const files = fs.readdirSync(this.historyDir)
      .filter(file => file.startsWith('metrics-') && file.endsWith('.json'))
      .sort();
    
    const periodDays = TRENDS_CONFIG.periods[period].days;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - periodDays);
    
    const historicalData = [];
    
    for (const file of files) {
      try {
        const filePath = path.join(this.historyDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.mtime >= cutoffDate) {
          const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          historicalData.push({
            timestamp: stats.mtime,
            data: data
          });
        }
      } catch (error) {
        console.warn(`⚠️ Error cargando ${file}:`, error.message);
      }
    }
    
    return historicalData;
  }
  
  /**
   * Genera datos sintéticos para demostración
   */
  generateSyntheticHistory(days = 30) {
    const syntheticData = [];
    const now = new Date();
    
    for (let i = days; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      const dayProgress = (days - i) / days;
      
      const services = {};
      for (const [serviceId, config] of Object.entries(SERVICES_CONFIG)) {
        // Simular progreso realista
        let completeness = config.completeness;
        
        if (serviceId === 'reservation-service') {
          // Simular degradación inicial y luego mejora
          if (dayProgress < 0.1) {
            completeness = 35 - (dayProgress * 50); // Degradación
          } else if (dayProgress < 0.6) {
            completeness = 30 + ((dayProgress - 0.1) * 120); // Reimplementación
          } else {
            completeness = Math.min(95, 90 + ((dayProgress - 0.6) * 12.5)); // Finalización
          }
        } else if (serviceId === 'asset-management-service') {
          // Mejora gradual
          completeness = Math.min(100, config.completeness + (dayProgress * 5));
        } else if (config.completeness < 100) {
          // Mejora lenta para otros servicios
          completeness = Math.min(100, config.completeness + (dayProgress * 2));
        }
        
        services[serviceId] = {
          ...config,
          completeness: Math.round(completeness),
          healthScore: this.calculateHealthScore(completeness, config.criticalIssues.length)
        };
      }
      
      syntheticData.push({
        timestamp: date,
        data: {
          timestamp: date.toISOString(),
          services: services
        }
      });
    }
    
    return syntheticData;
  }
  
  /**
   * Calcula health score sintético
   */
  calculateHealthScore(completeness, criticalIssues) {
    let score = completeness * 0.7;
    score += Math.max(0, 30 - (criticalIssues * 10));
    return Math.min(100, Math.round(score));
  }
  
  /**
   * Analiza tendencias de un servicio
   */
  analyzeServiceTrends(serviceId, historicalData) {
    if (historicalData.length < 2) {
      return {
        trend: 'insufficient_data',
        direction: 'unknown',
        rate: 0,
        confidence: 0
      };
    }
    
    const dataPoints = historicalData.map(entry => ({
      timestamp: entry.timestamp,
      completeness: entry.data.services[serviceId]?.completeness || 0,
      healthScore: entry.data.services[serviceId]?.healthScore || 0
    }));
    
    // Calcular tendencia de completeness
    const completenessValues = dataPoints.map(p => p.completeness);
    const completenessSlope = this.calculateSlope(completenessValues);
    
    // Calcular tendencia de health score
    const healthValues = dataPoints.map(p => p.healthScore);
    const healthSlope = this.calculateSlope(healthValues);
    
    // Determinar dirección general
    const avgSlope = (completenessSlope + healthSlope) / 2;
    let direction = 'stable';
    if (avgSlope > 0.5) direction = 'improving';
    else if (avgSlope < -0.5) direction = 'declining';
    
    // Calcular confianza basada en consistencia
    const confidence = this.calculateConfidence(completenessValues, healthValues);
    
    return {
      trend: direction,
      direction: direction,
      rate: Math.round(avgSlope * 100) / 100,
      completenessSlope: Math.round(completenessSlope * 100) / 100,
      healthSlope: Math.round(healthSlope * 100) / 100,
      confidence: Math.round(confidence * 100),
      dataPoints: dataPoints.length
    };
  }
  
  /**
   * Calcula pendiente de una serie de datos
   */
  calculateSlope(values) {
    if (values.length < 2) return 0;
    
    const n = values.length;
    const sumX = (n * (n - 1)) / 2; // 0 + 1 + 2 + ... + (n-1)
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, index) => sum + (index * val), 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6; // 0² + 1² + 2² + ... + (n-1)²
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return isNaN(slope) ? 0 : slope;
  }
  
  /**
   * Calcula confianza de la tendencia
   */
  calculateConfidence(completenessValues, healthValues) {
    if (completenessValues.length < 3) return 0.5;
    
    // Calcular variabilidad
    const completenessVariance = this.calculateVariance(completenessValues);
    const healthVariance = this.calculateVariance(healthValues);
    
    // Menor variabilidad = mayor confianza
    const avgVariance = (completenessVariance + healthVariance) / 2;
    const confidence = Math.max(0, Math.min(1, 1 - (avgVariance / 1000)));
    
    return confidence;
  }
  
  /**
   * Calcula varianza de una serie
   */
  calculateVariance(values) {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return variance;
  }
  
  /**
   * Genera proyecciones futuras
   */
  generateProjections(serviceId, currentTrend, days = 30) {
    const config = TRENDS_CONFIG.projectionFactors[serviceId];
    if (!config) {
      return this.generateSimpleProjection(serviceId, currentTrend, days);
    }
    
    const currentService = SERVICES_CONFIG[serviceId];
    const projections = [];
    
    let currentCompleteness = currentService.completeness;
    let currentDay = 0;
    
    // Proyectar por fases
    for (const phase of config.phases) {
      const dailyProgress = phase.progress / phase.duration;
      
      for (let day = 0; day < phase.duration && currentDay < days; day++, currentDay++) {
        currentCompleteness = Math.min(100, currentCompleteness + dailyProgress);
        
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + currentDay);
        
        projections.push({
          date: futureDate,
          completeness: Math.round(currentCompleteness),
          phase: phase.name,
          confidence: Math.max(0.3, 0.9 - (currentDay / days) * 0.6) // Confianza decrece con el tiempo
        });
      }
    }
    
    return projections;
  }
  
  /**
   * Genera proyección simple basada en tendencia
   */
  generateSimpleProjection(serviceId, trend, days) {
    const currentService = SERVICES_CONFIG[serviceId];
    const projections = [];
    
    let currentCompleteness = currentService.completeness;
    const dailyRate = trend.rate / 7; // Convertir rate semanal a diario
    
    for (let day = 1; day <= days; day++) {
      currentCompleteness = Math.max(0, Math.min(100, currentCompleteness + dailyRate));
      
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + day);
      
      projections.push({
        date: futureDate,
        completeness: Math.round(currentCompleteness),
        phase: 'projected',
        confidence: Math.max(0.2, trend.confidence / 100 - (day / days) * 0.5)
      });
    }
    
    return projections;
  }
  
  /**
   * Genera análisis completo de tendencias
   */
  generateTrendsAnalysis(period = '30d') {
    console.log(`📈 Generando análisis de tendencias para ${TRENDS_CONFIG.periods[period].label}...`);
    
    // Cargar datos históricos (o generar sintéticos para demo)
    let historicalData = this.loadHistoricalData(period);
    if (historicalData.length < 5) {
      console.log('📊 Generando datos sintéticos para demostración...');
      historicalData = this.generateSyntheticHistory(TRENDS_CONFIG.periods[period].days);
    }
    
    const analysis = {
      period: period,
      periodLabel: TRENDS_CONFIG.periods[period].label,
      dataPoints: historicalData.length,
      generatedAt: new Date().toISOString(),
      services: {},
      globalTrends: {},
      projections: {}
    };
    
    // Analizar cada servicio
    for (const serviceId of Object.keys(SERVICES_CONFIG)) {
      const serviceTrend = this.analyzeServiceTrends(serviceId, historicalData);
      analysis.services[serviceId] = {
        ...SERVICES_CONFIG[serviceId],
        trend: serviceTrend
      };
      
      // Generar proyecciones
      analysis.projections[serviceId] = this.generateProjections(serviceId, serviceTrend);
    }
    
    // Calcular tendencias globales
    analysis.globalTrends = this.calculateGlobalTrends(analysis.services);
    
    return analysis;
  }
  
  /**
   * Calcula tendencias globales del ecosistema
   */
  calculateGlobalTrends(servicesAnalysis) {
    const services = Object.values(servicesAnalysis);
    
    const avgCompleteness = services.reduce((sum, s) => sum + s.completeness, 0) / services.length;
    const avgTrendRate = services.reduce((sum, s) => sum + s.trend.rate, 0) / services.length;
    
    const improvingServices = services.filter(s => s.trend.direction === 'improving').length;
    const decliningServices = services.filter(s => s.trend.direction === 'declining').length;
    const stableServices = services.filter(s => s.trend.direction === 'stable').length;
    
    let overallDirection = 'stable';
    if (improvingServices > decliningServices) overallDirection = 'improving';
    else if (decliningServices > improvingServices) overallDirection = 'declining';
    
    return {
      avgCompleteness: Math.round(avgCompleteness),
      avgTrendRate: Math.round(avgTrendRate * 100) / 100,
      overallDirection,
      distribution: {
        improving: improvingServices,
        declining: decliningServices,
        stable: stableServices
      }
    };
  }
  
  /**
   * Formatea análisis como JSON
   */
  formatAsJSON(analysis) {
    return JSON.stringify(analysis, null, 2);
  }
  
  /**
   * Formatea análisis como Markdown
   */
  formatAsMarkdown(analysis) {
    let markdown = `# 📈 Análisis de Tendencias SmartEdify\n\n`;
    markdown += `**Período**: ${analysis.periodLabel}\n`;
    markdown += `**Puntos de Datos**: ${analysis.dataPoints}\n`;
    markdown += `**Generado**: ${new Date(analysis.generatedAt).toLocaleString()}\n\n`;
    
    // Tendencias globales
    markdown += `## 🌍 Tendencias Globales\n\n`;
    markdown += `- **Completitud Promedio**: ${analysis.globalTrends.avgCompleteness}%\n`;
    markdown += `- **Tasa de Cambio**: ${analysis.globalTrends.avgTrendRate}% por semana\n`;
    markdown += `- **Dirección General**: ${this.getDirectionEmoji(analysis.globalTrends.overallDirection)} ${analysis.globalTrends.overallDirection}\n`;
    markdown += `- **Distribución**:\n`;
    markdown += `  - 📈 Mejorando: ${analysis.globalTrends.distribution.improving} servicios\n`;
    markdown += `  - 📉 Declinando: ${analysis.globalTrends.distribution.declining} servicios\n`;
    markdown += `  - ➡️ Estable: ${analysis.globalTrends.distribution.stable} servicios\n\n`;
    
    // Análisis por servicio
    markdown += `## 📊 Análisis por Servicio\n\n`;
    for (const [serviceId, service] of Object.entries(analysis.services)) {
      const trendEmoji = this.getDirectionEmoji(service.trend.direction);
      const confidenceBar = '█'.repeat(Math.round(service.trend.confidence / 10));
      
      markdown += `### ${trendEmoji} ${service.name}\n`;
      markdown += `- **Completitud Actual**: ${service.completeness}%\n`;
      markdown += `- **Tendencia**: ${service.trend.direction} (${service.trend.rate}% por semana)\n`;
      markdown += `- **Confianza**: ${confidenceBar} ${service.trend.confidence}%\n`;
      markdown += `- **Puntos de Datos**: ${service.trend.dataPoints}\n`;
      
      // Proyecciones
      if (analysis.projections[serviceId] && analysis.projections[serviceId].length > 0) {
        const projections = analysis.projections[serviceId];
        const finalProjection = projections[projections.length - 1];
        markdown += `- **Proyección 30 días**: ${finalProjection.completeness}% (confianza: ${Math.round(finalProjection.confidence * 100)}%)\n`;
      }
      
      markdown += `\n`;
    }
    
    // Proyecciones detalladas
    markdown += `## 🔮 Proyecciones Detalladas\n\n`;
    for (const [serviceId, projections] of Object.entries(analysis.projections)) {
      if (projections.length === 0) continue;
      
      markdown += `### ${analysis.services[serviceId].name}\n\n`;
      markdown += `| Fecha | Completitud | Fase | Confianza |\n`;
      markdown += `|-------|-------------|------|----------|\n`;
      
      // Mostrar proyecciones semanales
      projections.filter((_, index) => index % 7 === 0 || index === projections.length - 1)
        .forEach(proj => {
          const date = proj.date.toLocaleDateString();
          const confidence = Math.round(proj.confidence * 100);
          markdown += `| ${date} | ${proj.completeness}% | ${proj.phase} | ${confidence}% |\n`;
        });
      
      markdown += `\n`;
    }
    
    return markdown;
  }
  
  /**
   * Obtiene emoji para dirección de tendencia
   */
  getDirectionEmoji(direction) {
    switch (direction) {
      case 'improving': return '📈';
      case 'declining': return '📉';
      case 'stable': return '➡️';
      default: return '❓';
    }
  }
  
  /**
   * Guarda análisis en archivo
   */
  saveAnalysis(analysis, format, outputFile) {
    let content;
    if (format === 'json') {
      content = this.formatAsJSON(analysis);
    } else {
      content = this.formatAsMarkdown(analysis);
    }
    
    fs.writeFileSync(outputFile, content);
    console.log(`💾 Análisis guardado en: ${outputFile}`);
  }
}

/**
 * Función principal
 */
function main() {
  const args = process.argv.slice(2);
  const period = args.includes('--period') ? args[args.indexOf('--period') + 1] : '30d';
  const format = args.includes('--format') ? args[args.indexOf('--format') + 1] : 'markdown';
  const outputFile = args.includes('--output') ? args[args.indexOf('--output') + 1] : null;
  
  if (!TRENDS_CONFIG.periods[period]) {
    console.error(`❌ Período inválido: ${period}. Opciones: ${Object.keys(TRENDS_CONFIG.periods).join(', ')}`);
    process.exit(1);
  }
  
  const analyzer = new TrendsAnalyzer();
  const analysis = analyzer.generateTrendsAnalysis(period);
  
  if (outputFile) {
    analyzer.saveAnalysis(analysis, format, outputFile);
  } else {
    if (format === 'json') {
      console.log(analyzer.formatAsJSON(analysis));
    } else {
      console.log(analyzer.formatAsMarkdown(analysis));
    }
  }
  
  // Guardar análisis histórico
  const historyFile = path.join(analyzer.historyDir, `trends-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(historyFile, analyzer.formatAsJSON(analysis));
  console.log(`📊 Análisis histórico guardado en: ${historyFile}`);
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main();
}

module.exports = { TrendsAnalyzer, TRENDS_CONFIG };