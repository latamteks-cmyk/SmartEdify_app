#!/usr/bin/env node

/**
 * SmartEdify Audit Suite Runner
 * Ejecuta el conjunto completo de herramientas de auditoría
 * 
 * Uso: node run-audit-suite.js [--mode full|quick|alerts] [--output-dir path]
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Configuración del suite de auditoría
const AUDIT_SUITE_CONFIG = {
  modes: {
    full: {
      description: 'Análisis completo con métricas, alertas y tendencias',
      scripts: ['generate-metrics.js', 'setup-alerts.js', 'generate-trends.js'],
      generateReports: true,
      updateDashboard: true
    },
    quick: {
      description: 'Análisis rápido solo con métricas actuales',
      scripts: ['generate-metrics.js'],
      generateReports: true,
      updateDashboard: true
    },
    alerts: {
      description: 'Solo procesamiento de alertas',
      scripts: ['setup-alerts.js'],
      generateReports: false,
      updateDashboard: false
    }
  },
  
  defaultOutputDir: path.join(__dirname, '..', 'reports'),
  
  reportFormats: ['markdown', 'json'],
  
  schedule: {
    full: '0 8 * * *',      // Diario a las 8:00 AM
    quick: '0 */4 * * *',   // Cada 4 horas
    alerts: '*/5 * * * *'   // Cada 5 minutos
  }
};

/**
 * Clase principal del suite de auditoría
 */
class AuditSuiteRunner {
  constructor(mode = 'full', outputDir = null) {
    this.mode = mode;
    this.outputDir = outputDir || AUDIT_SUITE_CONFIG.defaultOutputDir;
    this.scriptsDir = __dirname;
    this.results = {};
    
    this.ensureOutputDir();
  }
  
  /**
   * Asegura que existe el directorio de salida
   */
  ensureOutputDir() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
      console.log(`📁 Directorio de reportes creado: ${this.outputDir}`);
    }
  }
  
  /**
   * Ejecuta un script y captura su salida
   */
  async runScript(scriptName, args = []) {
    return new Promise((resolve, reject) => {
      const scriptPath = path.join(this.scriptsDir, scriptName);
      
      console.log(`🔄 Ejecutando: ${scriptName} ${args.join(' ')}`);
      
      const child = spawn('node', [scriptPath, ...args], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: this.scriptsDir
      });
      
      let stdout = '';
      let stderr = '';
      
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      child.on('close', (code) => {
        if (code === 0) {
          console.log(`✅ ${scriptName} completado exitosamente`);
          resolve({ stdout, stderr, code });
        } else {
          console.error(`❌ ${scriptName} falló con código ${code}`);
          console.error(stderr);
          reject(new Error(`Script ${scriptName} failed with code ${code}`));
        }
      });
      
      child.on('error', (error) => {
        console.error(`❌ Error ejecutando ${scriptName}:`, error.message);
        reject(error);
      });
    });
  }
  
  /**
   * Ejecuta el suite completo
   */
  async runSuite() {
    const config = AUDIT_SUITE_CONFIG.modes[this.mode];
    if (!config) {
      throw new Error(`Modo inválido: ${this.mode}`);
    }
    
    console.log(`🚀 Iniciando suite de auditoría en modo: ${this.mode}`);
    console.log(`📝 ${config.description}`);
    console.log(`📂 Directorio de salida: ${this.outputDir}`);
    
    const startTime = Date.now();
    
    try {
      // Ejecutar scripts según el modo
      for (const scriptName of config.scripts) {
        await this.runScriptWithConfig(scriptName);
      }
      
      // Generar reportes consolidados si está habilitado
      if (config.generateReports) {
        await this.generateConsolidatedReports();
      }
      
      // Actualizar dashboard si está habilitado
      if (config.updateDashboard) {
        await this.updateDashboard();
      }
      
      const duration = Date.now() - startTime;
      console.log(`🎉 Suite de auditoría completado en ${duration}ms`);
      
      return this.results;
      
    } catch (error) {
      console.error(`💥 Error en suite de auditoría:`, error.message);
      throw error;
    }
  }
  
  /**
   * Ejecuta un script con configuración específica
   */
  async runScriptWithConfig(scriptName) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    switch (scriptName) {
      case 'generate-metrics.js':
        // Generar métricas en ambos formatos
        for (const format of AUDIT_SUITE_CONFIG.reportFormats) {
          const outputFile = path.resolve(this.outputDir, `metrics-${timestamp}.${format === 'markdown' ? 'md' : 'json'}`);
          const result = await this.runScript(scriptName, ['--format', format, '--output', outputFile]);
          this.results.metrics = { ...this.results.metrics, [format]: outputFile };
        }
        break;
        
      case 'setup-alerts.js':
        // Ejecutar alertas en modo test
        const alertResult = await this.runScript(scriptName, ['--test']);
        this.results.alerts = { executed: true, output: alertResult.stdout };
        break;
        
      case 'generate-trends.js':
        // Generar análisis de tendencias para diferentes períodos
        const periods = ['7d', '30d'];
        for (const period of periods) {
          for (const format of AUDIT_SUITE_CONFIG.reportFormats) {
            const outputFile = path.resolve(this.outputDir, `trends-${period}-${timestamp}.${format === 'markdown' ? 'md' : 'json'}`);
            await this.runScript(scriptName, ['--period', period, '--format', format, '--output', outputFile]);
            this.results.trends = { ...this.results.trends, [`${period}_${format}`]: outputFile };
          }
        }
        break;
        
      default:
        console.warn(`⚠️ Script no reconocido: ${scriptName}`);
    }
  }
  
  /**
   * Genera reportes consolidados
   */
  async generateConsolidatedReports() {
    console.log('📋 Generando reportes consolidados...');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const consolidatedReport = {
      generatedAt: new Date().toISOString(),
      mode: this.mode,
      results: this.results,
      summary: await this.generateSummary()
    };
    
    // Guardar reporte consolidado JSON
    const jsonReportPath = path.resolve(this.outputDir, `consolidated-report-${timestamp}.json`);
    fs.writeFileSync(jsonReportPath, JSON.stringify(consolidatedReport, null, 2));
    
    // Generar reporte consolidado Markdown
    const markdownReportPath = path.resolve(this.outputDir, `consolidated-report-${timestamp}.md`);
    const markdownContent = this.generateMarkdownReport(consolidatedReport);
    fs.writeFileSync(markdownReportPath, markdownContent);
    
    this.results.consolidated = {
      json: jsonReportPath,
      markdown: markdownReportPath
    };
    
    console.log(`📄 Reporte consolidado generado: ${markdownReportPath}`);
  }
  
  /**
   * Genera resumen ejecutivo
   */
  async generateSummary() {
    // Cargar métricas más recientes si existen
    let metricsData = null;
    if (this.results.metrics && this.results.metrics.json) {
      try {
        metricsData = JSON.parse(fs.readFileSync(this.results.metrics.json, 'utf8'));
      } catch (error) {
        console.warn('⚠️ No se pudieron cargar métricas para resumen');
      }
    }
    
    const summary = {
      timestamp: new Date().toISOString(),
      mode: this.mode,
      executionStatus: 'completed'
    };
    
    if (metricsData) {
      summary.globalMetrics = metricsData.global;
      summary.criticalAlerts = metricsData.alerts?.filter(a => a.level === 'CRITICAL').length || 0;
      summary.warningAlerts = metricsData.alerts?.filter(a => a.level === 'WARNING').length || 0;
      summary.servicesCount = Object.keys(metricsData.services || {}).length;
    }
    
    return summary;
  }
  
  /**
   * Genera reporte Markdown consolidado
   */
  generateMarkdownReport(consolidatedReport) {
    let markdown = `# 📊 Reporte Consolidado de Auditoría SmartEdify\n\n`;
    markdown += `**Generado**: ${new Date(consolidatedReport.generatedAt).toLocaleString()}\n`;
    markdown += `**Modo**: ${consolidatedReport.mode}\n\n`;
    
    // Resumen ejecutivo
    if (consolidatedReport.summary) {
      markdown += `## 🎯 Resumen Ejecutivo\n\n`;
      const summary = consolidatedReport.summary;
      
      if (summary.globalMetrics) {
        markdown += `- **Servicios Totales**: ${summary.globalMetrics.totalServices}\n`;
        markdown += `- **Servicios Funcionales**: ${summary.globalMetrics.functionalServices}\n`;
        markdown += `- **Completitud Promedio**: ${summary.globalMetrics.avgCompleteness}%\n`;
      }
      
      if (summary.criticalAlerts !== undefined) {
        markdown += `- **Alertas Críticas**: ${summary.criticalAlerts}\n`;
        markdown += `- **Alertas de Advertencia**: ${summary.warningAlerts}\n`;
      }
      
      markdown += `\n`;
    }
    
    // Archivos generados
    markdown += `## 📁 Archivos Generados\n\n`;
    for (const [category, files] of Object.entries(consolidatedReport.results)) {
      if (typeof files === 'object' && files !== null) {
        markdown += `### ${category.charAt(0).toUpperCase() + category.slice(1)}\n`;
        for (const [format, filePath] of Object.entries(files)) {
          if (typeof filePath === 'string') {
            const fileName = path.basename(filePath);
            markdown += `- **${format}**: \`${fileName}\`\n`;
          }
        }
        markdown += `\n`;
      }
    }
    
    // Próximos pasos
    markdown += `## 🎯 Próximos Pasos\n\n`;
    markdown += `1. Revisar alertas críticas identificadas\n`;
    markdown += `2. Implementar recomendaciones de alta prioridad\n`;
    markdown += `3. Monitorear tendencias de servicios en desarrollo\n`;
    markdown += `4. Programar próxima ejecución de auditoría\n\n`;
    
    markdown += `---\n`;
    markdown += `*Generado automáticamente por SmartEdify Audit Suite*\n`;
    
    return markdown;
  }
  
  /**
   * Actualiza el dashboard principal
   */
  async updateDashboard() {
    console.log('📊 Actualizando dashboard principal...');
    
    const dashboardPath = path.join(__dirname, '..', 'dashboard-metricas.md');
    
    // Si tenemos métricas nuevas, actualizar el dashboard
    if (this.results.metrics && this.results.metrics.markdown) {
      try {
        const newMetricsContent = fs.readFileSync(this.results.metrics.markdown, 'utf8');
        
        // Actualizar timestamp en el dashboard
        let dashboardContent = newMetricsContent;
        dashboardContent = dashboardContent.replace(
          /\*\*Fecha de Actualización\*\*: .+/,
          `**Fecha de Actualización**: ${new Date().toISOString().split('T')[0]}`
        );
        
        fs.writeFileSync(dashboardPath, dashboardContent);
        console.log(`✅ Dashboard actualizado: ${dashboardPath}`);
        
      } catch (error) {
        console.warn('⚠️ No se pudo actualizar el dashboard:', error.message);
      }
    }
  }
  
  /**
   * Programa ejecuciones automáticas
   */
  scheduleAutomaticRuns() {
    console.log('⏰ Configurando ejecuciones automáticas...');
    
    // En un entorno real, esto usaría cron o un scheduler
    // Por ahora, solo mostramos la configuración
    for (const [mode, schedule] of Object.entries(AUDIT_SUITE_CONFIG.schedule)) {
      console.log(`📅 ${mode}: ${schedule}`);
    }
    
    console.log('💡 Para habilitar scheduling automático, configure cron jobs:');
    console.log(`   ${AUDIT_SUITE_CONFIG.schedule.full} cd ${this.scriptsDir} && node run-audit-suite.js --mode full`);
    console.log(`   ${AUDIT_SUITE_CONFIG.schedule.quick} cd ${this.scriptsDir} && node run-audit-suite.js --mode quick`);
    console.log(`   ${AUDIT_SUITE_CONFIG.schedule.alerts} cd ${this.scriptsDir} && node run-audit-suite.js --mode alerts`);
  }
}

/**
 * Función principal
 */
async function main() {
  const args = process.argv.slice(2);
  const mode = args.includes('--mode') ? args[args.indexOf('--mode') + 1] : 'full';
  const outputDir = args.includes('--output-dir') ? args[args.indexOf('--output-dir') + 1] : null;
  const showSchedule = args.includes('--show-schedule');
  
  if (showSchedule) {
    const runner = new AuditSuiteRunner();
    runner.scheduleAutomaticRuns();
    return;
  }
  
  if (!AUDIT_SUITE_CONFIG.modes[mode]) {
    console.error(`❌ Modo inválido: ${mode}`);
    console.error(`Modos disponibles: ${Object.keys(AUDIT_SUITE_CONFIG.modes).join(', ')}`);
    process.exit(1);
  }
  
  try {
    const runner = new AuditSuiteRunner(mode, outputDir);
    const results = await runner.runSuite();
    
    console.log('\n🎉 Suite de auditoría completado exitosamente!');
    console.log('📁 Archivos generados:');
    
    for (const [category, files] of Object.entries(results)) {
      if (typeof files === 'object' && files !== null) {
        console.log(`  ${category}:`);
        for (const [format, filePath] of Object.entries(files)) {
          if (typeof filePath === 'string') {
            console.log(`    - ${format}: ${filePath}`);
          }
        }
      }
    }
    
  } catch (error) {
    console.error('\n💥 Error ejecutando suite de auditoría:', error.message);
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main();
}

module.exports = { AuditSuiteRunner, AUDIT_SUITE_CONFIG };