#!/usr/bin/env node

/**
 * SmartEdify Audit Environment Setup
 * Configura el entorno completo para auditoría continua
 * 
 * Uso: node setup-audit-environment.js [--install-deps] [--setup-cron] [--configure-ci]
 */

const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');

// Configuración del entorno
const ENVIRONMENT_CONFIG = {
  directories: [
    'auditoria/reports',
    'auditoria/history',
    'auditoria/cache',
    'auditoria/logs',
    'auditoria/config'
  ],
  
  dependencies: [
    // No hay dependencias externas por ahora, solo Node.js built-ins
  ],
  
  configFiles: {
    'auditoria/config/audit-config.json': {
      schedule: {
        full: '0 8 * * *',
        quick: '0 */4 * * *',
        alerts: '*/5 * * * *'
      },
      notifications: {
        email: {
          enabled: false,
          smtp: {
            host: 'smtp.smartedify.com',
            port: 587,
            secure: false
          },
          recipients: ['dev-team@smartedify.com']
        },
        slack: {
          enabled: false,
          webhook: '',
          channel: '#smartedify-alerts'
        }
      },
      cache: {
        enabled: true,
        ttl: 3600,
        maxSize: '100MB'
      },
      retention: {
        reports: 30,
        history: 90,
        logs: 7
      }
    },
    
    'auditoria/config/services-config.json': {
      services: {
        'governance-service': { priority: 'P2', weight: 1.0 },
        'streaming-service': { priority: 'P3', weight: 1.0 },
        'user-profiles-service': { priority: 'P3', weight: 1.0 },
        'notifications-service': { priority: 'P3', weight: 1.0 },
        'documents-service': { priority: 'P3', weight: 1.0 },
        'finance-service': { priority: 'P3', weight: 1.0 },
        'reservation-service': { priority: 'P0', weight: 2.0 },
        'asset-management-service': { priority: 'P1', weight: 1.5 }
      },
      thresholds: {
        critical: { completeness: 50, healthScore: 40 },
        warning: { completeness: 80, healthScore: 70 }
      }
    }
  },
  
  cronJobs: [
    {
      schedule: '0 8 * * *',
      command: 'cd /path/to/auditoria/scripts && node run-audit-suite.js --mode full',
      description: 'Análisis completo diario'
    },
    {
      schedule: '0 */4 * * *',
      command: 'cd /path/to/auditoria/scripts && node run-audit-suite.js --mode quick',
      description: 'Análisis rápido cada 4 horas'
    },
    {
      schedule: '*/5 * * * *',
      command: 'cd /path/to/auditoria/scripts && node setup-alerts.js --test',
      description: 'Verificación de alertas cada 5 minutos'
    },
    {
      schedule: '0 2 * * 0',
      command: 'cd /path/to/auditoria/scripts && node cache-manager.js --action cleanup',
      description: 'Limpieza de cache semanal'
    }
  ]
};

/**
 * Clase para configuración del entorno
 */
class AuditEnvironmentSetup {
  constructor() {
    this.baseDir = path.resolve(__dirname, '..');
    this.scriptsDir = __dirname;
  }
  
  /**
   * Configura el entorno completo
   */
  async setupEnvironment(options = {}) {
    console.log('🚀 Configurando entorno de auditoría SmartEdify...');
    
    try {
      // 1. Crear directorios
      this.createDirectories();
      
      // 2. Crear archivos de configuración
      this.createConfigFiles();
      
      // 3. Instalar dependencias si se solicita
      if (options.installDeps) {
        await this.installDependencies();
      }
      
      // 4. Configurar cron jobs si se solicita
      if (options.setupCron) {
        this.setupCronJobs();
      }
      
      // 5. Configurar CI/CD si se solicita
      if (options.configureCi) {
        this.configureCiCd();
      }
      
      // 6. Crear scripts de utilidad
      this.createUtilityScripts();
      
      // 7. Configurar logging
      this.setupLogging();
      
      // 8. Ejecutar verificación inicial
      await this.runInitialVerification();
      
      console.log('✅ Entorno de auditoría configurado exitosamente!');
      this.printUsageInstructions();
      
    } catch (error) {
      console.error('❌ Error configurando entorno:', error.message);
      throw error;
    }
  }
  
  /**
   * Crea directorios necesarios
   */
  createDirectories() {
    console.log('📁 Creando directorios...');
    
    for (const dir of ENVIRONMENT_CONFIG.directories) {
      const fullPath = path.join(this.baseDir, '..', dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
        console.log(`  ✅ ${dir}`);
      } else {
        console.log(`  ⏭️ ${dir} (ya existe)`);
      }
    }
  }
  
  /**
   * Crea archivos de configuración
   */
  createConfigFiles() {
    console.log('⚙️ Creando archivos de configuración...');
    
    for (const [filePath, content] of Object.entries(ENVIRONMENT_CONFIG.configFiles)) {
      const fullPath = path.join(this.baseDir, '..', filePath);
      
      if (!fs.existsSync(fullPath)) {
        fs.writeFileSync(fullPath, JSON.stringify(content, null, 2));
        console.log(`  ✅ ${filePath}`);
      } else {
        console.log(`  ⏭️ ${filePath} (ya existe)`);
      }
    }
  }
  
  /**
   * Instala dependencias
   */
  async installDependencies() {
    console.log('📦 Instalando dependencias...');
    
    // Crear package.json si no existe
    const packageJsonPath = path.join(this.scriptsDir, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      const packageJson = {
        name: 'smartedify-audit-scripts',
        version: '1.0.0',
        description: 'Scripts de auditoría para SmartEdify',
        main: 'run-audit-suite.js',
        scripts: {
          audit: 'node run-audit-suite.js',
          'audit:full': 'node run-audit-suite.js --mode full',
          'audit:quick': 'node run-audit-suite.js --mode quick',
          'audit:alerts': 'node setup-alerts.js --test',
          metrics: 'node generate-metrics.js',
          trends: 'node generate-trends.js',
          cache: 'node cache-manager.js --action stats'
        },
        dependencies: {},
        devDependencies: {},
        engines: {
          node: '>=16.0.0'
        }
      };
      
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
      console.log('  ✅ package.json creado');
    }
    
    // Por ahora no hay dependencias externas
    console.log('  ✅ No hay dependencias externas requeridas');
  }
  
  /**
   * Configura cron jobs
   */
  setupCronJobs() {
    console.log('⏰ Configurando cron jobs...');
    
    const cronContent = ENVIRONMENT_CONFIG.cronJobs.map(job => {
      const command = job.command.replace('/path/to/', path.resolve(this.baseDir) + '/');
      return `# ${job.description}\n${job.schedule} ${command}`;
    }).join('\n\n');
    
    const cronFile = path.join(this.baseDir, 'config', 'smartedify-audit.cron');
    fs.writeFileSync(cronFile, cronContent);
    
    console.log(`  ✅ Archivo cron creado: ${cronFile}`);
    console.log('  💡 Para instalar: crontab ' + cronFile);
    console.log('  💡 Para ver cron actual: crontab -l');
  }
  
  /**
   * Configura CI/CD
   */
  configureCiCd() {
    console.log('🔄 Configurando CI/CD...');
    
    // Copiar archivo de pipeline si no existe
    const pipelineSource = path.join(this.scriptsDir, 'audit-pipeline.yml');
    const githubActionsDir = path.join(this.baseDir, '..', '..', '.github', 'workflows');
    const pipelineTarget = path.join(githubActionsDir, 'smartedify-audit.yml');
    
    if (!fs.existsSync(githubActionsDir)) {
      fs.mkdirSync(githubActionsDir, { recursive: true });
    }
    
    if (!fs.existsSync(pipelineTarget)) {
      fs.copyFileSync(pipelineSource, pipelineTarget);
      console.log('  ✅ GitHub Actions workflow configurado');
    } else {
      console.log('  ⏭️ GitHub Actions workflow ya existe');
    }
    
    // Crear archivo de configuración para otros CI/CD
    const ciConfigPath = path.join(this.baseDir, 'config', 'ci-cd-setup.md');
    const ciConfigContent = `# Configuración CI/CD para SmartEdify Audit

## GitHub Actions
El workflow está configurado en \`.github/workflows/smartedify-audit.yml\`

## GitLab CI
Agregar al \`.gitlab-ci.yml\`:
\`\`\`yaml
include:
  - local: 'auditoria/scripts/audit-pipeline.yml'
\`\`\`

## Jenkins
Usar el pipeline definido en \`audit-pipeline.yml\`

## Variables de Entorno Requeridas
- \`SLACK_WEBHOOK\`: Webhook de Slack para notificaciones
- \`SMTP_SERVER\`: Servidor SMTP para emails
- \`SMTP_USERNAME\`: Usuario SMTP
- \`SMTP_PASSWORD\`: Contraseña SMTP
- \`AUDIT_EMAIL_RECIPIENTS\`: Lista de emails separados por coma
`;
    
    fs.writeFileSync(ciConfigPath, ciConfigContent);
    console.log('  ✅ Documentación CI/CD creada');
  }
  
  /**
   * Crea scripts de utilidad
   */
  createUtilityScripts() {
    console.log('🔧 Creando scripts de utilidad...');
    
    // Script de inicio rápido
    const quickStartScript = `#!/bin/bash
# SmartEdify Audit Quick Start

echo "🚀 Iniciando auditoría SmartEdify..."

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js no está instalado"
    exit 1
fi

# Ir al directorio de scripts
cd "$(dirname "$0")"

# Ejecutar auditoría rápida
echo "📊 Ejecutando auditoría rápida..."
node run-audit-suite.js --mode quick

echo "✅ Auditoría completada!"
echo "📁 Ver reportes en: ../reports/"
`;
    
    const quickStartPath = path.join(this.scriptsDir, 'quick-start.sh');
    fs.writeFileSync(quickStartPath, quickStartScript);
    
    // Hacer ejecutable en sistemas Unix
    try {
      fs.chmodSync(quickStartPath, '755');
    } catch (error) {
      // Ignorar en Windows
    }
    
    // Script de Windows
    const quickStartBat = `@echo off
REM SmartEdify Audit Quick Start for Windows

echo 🚀 Iniciando auditoría SmartEdify...

REM Verificar Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js no está instalado
    exit /b 1
)

REM Ir al directorio de scripts
cd /d "%~dp0"

REM Ejecutar auditoría rápida
echo 📊 Ejecutando auditoría rápida...
node run-audit-suite.js --mode quick

echo ✅ Auditoría completada!
echo 📁 Ver reportes en: ../reports/
pause
`;
    
    const quickStartBatPath = path.join(this.scriptsDir, 'quick-start.bat');
    fs.writeFileSync(quickStartBatPath, quickStartBat);
    
    console.log('  ✅ Scripts de utilidad creados');
  }
  
  /**
   * Configura logging
   */
  setupLogging() {
    console.log('📝 Configurando logging...');
    
    const logConfig = {
      level: 'info',
      format: 'json',
      outputs: [
        {
          type: 'file',
          path: '../logs/audit.log',
          maxSize: '10MB',
          maxFiles: 5
        },
        {
          type: 'console',
          colorize: true
        }
      ]
    };
    
    const logConfigPath = path.join(this.baseDir, 'config', 'logging.json');
    fs.writeFileSync(logConfigPath, JSON.stringify(logConfig, null, 2));
    
    console.log('  ✅ Configuración de logging creada');
  }
  
  /**
   * Ejecuta verificación inicial
   */
  async runInitialVerification() {
    console.log('🔍 Ejecutando verificación inicial...');
    
    try {
      // Verificar que los scripts principales funcionan
      const { spawn } = require('child_process');
      
      const testMetrics = spawn('node', ['generate-metrics.js', '--format', 'json'], {
        cwd: this.scriptsDir,
        stdio: 'pipe'
      });
      
      let output = '';
      testMetrics.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      await new Promise((resolve, reject) => {
        testMetrics.on('close', (code) => {
          if (code === 0) {
            console.log('  ✅ generate-metrics.js funciona correctamente');
            resolve();
          } else {
            reject(new Error(`generate-metrics.js falló con código ${code}`));
          }
        });
      });
      
    } catch (error) {
      console.warn('  ⚠️ Verificación inicial falló:', error.message);
    }
  }
  
  /**
   * Muestra instrucciones de uso
   */
  printUsageInstructions() {
    console.log(`
🎉 ¡Entorno de auditoría SmartEdify configurado exitosamente!

📋 Próximos pasos:

1. 🔧 Configurar variables de entorno (opcional):
   export SLACK_WEBHOOK="https://hooks.slack.com/services/..."
   export SMTP_USER="alerts@smartedify.com"
   export SMTP_PASS="your-password"

2. ⏰ Instalar cron jobs (Linux/Mac):
   crontab auditoria/config/smartedify-audit.cron

3. 🚀 Ejecutar primera auditoría:
   cd auditoria/scripts
   ./quick-start.sh    # Linux/Mac
   quick-start.bat     # Windows

4. 📊 Ver reportes:
   - Dashboard: auditoria/dashboard-metricas.md
   - Reportes: auditoria/reports/
   - Historial: auditoria/history/

5. 🔄 Configurar CI/CD:
   - GitHub Actions: Ya configurado en .github/workflows/
   - Otros: Ver auditoria/config/ci-cd-setup.md

📚 Comandos útiles:
   node run-audit-suite.js --mode full     # Auditoría completa
   node run-audit-suite.js --mode quick    # Auditoría rápida
   node setup-alerts.js --test             # Probar alertas
   node cache-manager.js --action stats    # Ver estadísticas de cache

🆘 Soporte:
   - README: auditoria/scripts/README.md
   - Logs: auditoria/logs/audit.log
`);
  }
}

/**
 * Función principal
 */
async function main() {
  const args = process.argv.slice(2);
  const installDeps = args.includes('--install-deps');
  const setupCron = args.includes('--setup-cron');
  const configureCi = args.includes('--configure-ci');
  
  const setup = new AuditEnvironmentSetup();
  
  try {
    await setup.setupEnvironment({
      installDeps,
      setupCron,
      configureCi
    });
  } catch (error) {
    console.error('💥 Error en configuración:', error.message);
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main();
}

module.exports = { AuditEnvironmentSetup, ENVIRONMENT_CONFIG };