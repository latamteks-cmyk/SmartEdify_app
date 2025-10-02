#!/usr/bin/env node

/**
 * SmartEdify Audit Cache Manager
 * Gestiona cache de resultados para optimizar análisis repetitivos
 * 
 * Uso: node cache-manager.js [--action get|set|clear|stats] [--key cache-key] [--ttl seconds]
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Configuración del cache
const CACHE_CONFIG = {
  baseDir: path.join(__dirname, '..', 'cache'),
  defaultTTL: 3600, // 1 hora en segundos
  maxSize: 100 * 1024 * 1024, // 100MB
  cleanupInterval: 24 * 60 * 60 * 1000, // 24 horas en ms
  
  // Configuración por tipo de cache
  types: {
    metrics: { ttl: 300, maxEntries: 100 },      // 5 minutos
    trends: { ttl: 1800, maxEntries: 50 },       // 30 minutos
    alerts: { ttl: 60, maxEntries: 200 },        // 1 minuto
    services: { ttl: 3600, maxEntries: 20 },     // 1 hora
    integrations: { ttl: 1800, maxEntries: 30 }  // 30 minutos
  }
};

/**
 * Clase para gestión de cache
 */
class CacheManager {
  constructor(config = CACHE_CONFIG) {
    this.config = config;
    this.cacheDir = config.baseDir;
    this.metadataFile = path.join(this.cacheDir, 'metadata.json');
    
    this.ensureCacheDir();
    this.loadMetadata();
    this.startCleanupTimer();
  }
  
  /**
   * Asegura que existe el directorio de cache
   */
  ensureCacheDir() {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
      console.log(`📁 Directorio de cache creado: ${this.cacheDir}`);
    }
  }
  
  /**
   * Carga metadatos del cache
   */
  loadMetadata() {
    if (fs.existsSync(this.metadataFile)) {
      try {
        this.metadata = JSON.parse(fs.readFileSync(this.metadataFile, 'utf8'));
      } catch (error) {
        console.warn('⚠️ Error cargando metadatos de cache, inicializando nuevo');
        this.metadata = { entries: {}, stats: { hits: 0, misses: 0, sets: 0 } };
      }
    } else {
      this.metadata = { entries: {}, stats: { hits: 0, misses: 0, sets: 0 } };
    }
  }
  
  /**
   * Guarda metadatos del cache
   */
  saveMetadata() {
    fs.writeFileSync(this.metadataFile, JSON.stringify(this.metadata, null, 2));
  }
  
  /**
   * Genera hash para una clave
   */
  generateHash(key) {
    return crypto.createHash('sha256').update(key).digest('hex');
  }
  
  /**
   * Obtiene ruta del archivo de cache
   */
  getCacheFilePath(key) {
    const hash = this.generateHash(key);
    return path.join(this.cacheDir, `${hash}.json`);
  }
  
  /**
   * Verifica si una entrada ha expirado
   */
  isExpired(entry) {
    if (!entry.expiresAt) return false;
    return Date.now() > entry.expiresAt;
  }
  
  /**
   * Obtiene valor del cache
   */
  get(key) {
    const hash = this.generateHash(key);
    const entry = this.metadata.entries[hash];
    
    if (!entry) {
      this.metadata.stats.misses++;
      return null;
    }
    
    if (this.isExpired(entry)) {
      this.delete(key);
      this.metadata.stats.misses++;
      return null;
    }
    
    try {
      const filePath = this.getCacheFilePath(key);
      if (!fs.existsSync(filePath)) {
        delete this.metadata.entries[hash];
        this.metadata.stats.misses++;
        return null;
      }
      
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      // Actualizar último acceso
      entry.lastAccessed = Date.now();
      entry.accessCount = (entry.accessCount || 0) + 1;
      
      this.metadata.stats.hits++;
      this.saveMetadata();
      
      return data;
      
    } catch (error) {
      console.warn(`⚠️ Error leyendo cache para ${key}:`, error.message);
      this.delete(key);
      this.metadata.stats.misses++;
      return null;
    }
  }
  
  /**
   * Establece valor en el cache
   */
  set(key, value, ttl = null) {
    const hash = this.generateHash(key);
    const filePath = this.getCacheFilePath(key);
    
    // Determinar TTL
    const finalTTL = ttl || this.config.defaultTTL;
    const expiresAt = finalTTL > 0 ? Date.now() + (finalTTL * 1000) : null;
    
    try {
      // Guardar datos
      fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
      
      // Actualizar metadatos
      this.metadata.entries[hash] = {
        key: key,
        hash: hash,
        createdAt: Date.now(),
        lastAccessed: Date.now(),
        expiresAt: expiresAt,
        ttl: finalTTL,
        size: fs.statSync(filePath).size,
        accessCount: 0
      };
      
      this.metadata.stats.sets++;
      this.saveMetadata();
      
      console.log(`💾 Cache guardado: ${key} (TTL: ${finalTTL}s)`);
      return true;
      
    } catch (error) {
      console.error(`❌ Error guardando cache para ${key}:`, error.message);
      return false;
    }
  }
  
  /**
   * Elimina entrada del cache
   */
  delete(key) {
    const hash = this.generateHash(key);
    const entry = this.metadata.entries[hash];
    
    if (entry) {
      const filePath = this.getCacheFilePath(key);
      
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        delete this.metadata.entries[hash];
        this.saveMetadata();
        
        console.log(`🗑️ Cache eliminado: ${key}`);
        return true;
        
      } catch (error) {
        console.warn(`⚠️ Error eliminando cache para ${key}:`, error.message);
        return false;
      }
    }
    
    return false;
  }
  
  /**
   * Limpia cache expirado
   */
  cleanup() {
    console.log('🧹 Iniciando limpieza de cache...');
    
    let cleanedCount = 0;
    let freedSpace = 0;
    
    for (const [hash, entry] of Object.entries(this.metadata.entries)) {
      if (this.isExpired(entry)) {
        const filePath = path.join(this.cacheDir, `${hash}.json`);
        
        try {
          if (fs.existsSync(filePath)) {
            const size = fs.statSync(filePath).size;
            fs.unlinkSync(filePath);
            freedSpace += size;
          }
          
          delete this.metadata.entries[hash];
          cleanedCount++;
          
        } catch (error) {
          console.warn(`⚠️ Error limpiando ${entry.key}:`, error.message);
        }
      }
    }
    
    this.saveMetadata();
    
    console.log(`✅ Limpieza completada: ${cleanedCount} entradas eliminadas, ${this.formatBytes(freedSpace)} liberados`);
    return { cleanedCount, freedSpace };
  }
  
  /**
   * Limpia cache por tamaño (LRU)
   */
  cleanupBySize() {
    const currentSize = this.getCurrentSize();
    
    if (currentSize <= this.config.maxSize) {
      return { cleanedCount: 0, freedSpace: 0 };
    }
    
    console.log(`🧹 Cache excede tamaño máximo (${this.formatBytes(currentSize)} > ${this.formatBytes(this.config.maxSize)})`);
    
    // Ordenar por último acceso (LRU)
    const entries = Object.values(this.metadata.entries)
      .sort((a, b) => a.lastAccessed - b.lastAccessed);
    
    let cleanedCount = 0;
    let freedSpace = 0;
    
    for (const entry of entries) {
      if (currentSize - freedSpace <= this.config.maxSize) {
        break;
      }
      
      const filePath = path.join(this.cacheDir, `${entry.hash}.json`);
      
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          freedSpace += entry.size;
        }
        
        delete this.metadata.entries[entry.hash];
        cleanedCount++;
        
      } catch (error) {
        console.warn(`⚠️ Error limpiando ${entry.key}:`, error.message);
      }
    }
    
    this.saveMetadata();
    
    console.log(`✅ Limpieza por tamaño completada: ${cleanedCount} entradas eliminadas, ${this.formatBytes(freedSpace)} liberados`);
    return { cleanedCount, freedSpace };
  }
  
  /**
   * Obtiene tamaño actual del cache
   */
  getCurrentSize() {
    return Object.values(this.metadata.entries)
      .reduce((total, entry) => total + (entry.size || 0), 0);
  }
  
  /**
   * Obtiene estadísticas del cache
   */
  getStats() {
    const entries = Object.values(this.metadata.entries);
    const currentSize = this.getCurrentSize();
    const hitRate = this.metadata.stats.hits / (this.metadata.stats.hits + this.metadata.stats.misses) * 100;
    
    return {
      entries: {
        total: entries.length,
        expired: entries.filter(e => this.isExpired(e)).length,
        active: entries.filter(e => !this.isExpired(e)).length
      },
      size: {
        current: currentSize,
        max: this.config.maxSize,
        usage: (currentSize / this.config.maxSize) * 100,
        formatted: {
          current: this.formatBytes(currentSize),
          max: this.formatBytes(this.config.maxSize)
        }
      },
      performance: {
        hits: this.metadata.stats.hits,
        misses: this.metadata.stats.misses,
        sets: this.metadata.stats.sets,
        hitRate: isNaN(hitRate) ? 0 : hitRate.toFixed(2)
      },
      oldestEntry: entries.length > 0 ? 
        new Date(Math.min(...entries.map(e => e.createdAt))).toISOString() : null,
      newestEntry: entries.length > 0 ? 
        new Date(Math.max(...entries.map(e => e.createdAt))).toISOString() : null
    };
  }
  
  /**
   * Formatea bytes en formato legible
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  /**
   * Inicia timer de limpieza automática
   */
  startCleanupTimer() {
    setInterval(() => {
      this.cleanup();
      this.cleanupBySize();
    }, this.config.cleanupInterval);
    
    console.log(`⏰ Timer de limpieza configurado (cada ${this.config.cleanupInterval / 1000 / 60} minutos)`);
  }
  
  /**
   * Limpia todo el cache
   */
  clear() {
    console.log('🗑️ Limpiando todo el cache...');
    
    let cleanedCount = 0;
    
    for (const [hash, entry] of Object.entries(this.metadata.entries)) {
      const filePath = path.join(this.cacheDir, `${hash}.json`);
      
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        cleanedCount++;
      } catch (error) {
        console.warn(`⚠️ Error eliminando ${entry.key}:`, error.message);
      }
    }
    
    // Resetear metadatos
    this.metadata = { entries: {}, stats: { hits: 0, misses: 0, sets: 0 } };
    this.saveMetadata();
    
    console.log(`✅ Cache limpiado completamente: ${cleanedCount} entradas eliminadas`);
    return cleanedCount;
  }
}

/**
 * Funciones de utilidad para integración con scripts de auditoría
 */
class AuditCacheHelper {
  constructor() {
    this.cache = new CacheManager();
  }
  
  /**
   * Cache para métricas de servicios
   */
  cacheServiceMetrics(serviceId, metrics) {
    const key = `service_metrics:${serviceId}`;
    const ttl = CACHE_CONFIG.types.services.ttl;
    return this.cache.set(key, metrics, ttl);
  }
  
  getServiceMetrics(serviceId) {
    const key = `service_metrics:${serviceId}`;
    return this.cache.get(key);
  }
  
  /**
   * Cache para análisis de tendencias
   */
  cacheTrendsAnalysis(period, analysis) {
    const key = `trends_analysis:${period}`;
    const ttl = CACHE_CONFIG.types.trends.ttl;
    return this.cache.set(key, analysis, ttl);
  }
  
  getTrendsAnalysis(period) {
    const key = `trends_analysis:${period}`;
    return this.cache.get(key);
  }
  
  /**
   * Cache para alertas
   */
  cacheAlerts(alerts) {
    const key = `alerts:${Date.now()}`;
    const ttl = CACHE_CONFIG.types.alerts.ttl;
    return this.cache.set(key, alerts, ttl);
  }
  
  getLatestAlerts() {
    // Buscar la alerta más reciente
    const entries = Object.values(this.cache.metadata.entries)
      .filter(e => e.key.startsWith('alerts:'))
      .sort((a, b) => b.createdAt - a.createdAt);
    
    if (entries.length > 0) {
      return this.cache.get(entries[0].key);
    }
    
    return null;
  }
  
  /**
   * Invalida cache relacionado con un servicio
   */
  invalidateServiceCache(serviceId) {
    const keysToInvalidate = [
      `service_metrics:${serviceId}`,
      'trends_analysis:7d',
      'trends_analysis:30d',
      'trends_analysis:90d'
    ];
    
    let invalidatedCount = 0;
    for (const key of keysToInvalidate) {
      if (this.cache.delete(key)) {
        invalidatedCount++;
      }
    }
    
    console.log(`🔄 Cache invalidado para ${serviceId}: ${invalidatedCount} entradas`);
    return invalidatedCount;
  }
}

/**
 * Función principal
 */
function main() {
  const args = process.argv.slice(2);
  const action = args.includes('--action') ? args[args.indexOf('--action') + 1] : 'stats';
  const key = args.includes('--key') ? args[args.indexOf('--key') + 1] : null;
  const ttl = args.includes('--ttl') ? parseInt(args[args.indexOf('--ttl') + 1]) : null;
  
  const cache = new CacheManager();
  
  switch (action) {
    case 'get':
      if (!key) {
        console.error('❌ Se requiere --key para la acción get');
        process.exit(1);
      }
      
      const value = cache.get(key);
      if (value) {
        console.log('✅ Valor encontrado en cache:');
        console.log(JSON.stringify(value, null, 2));
      } else {
        console.log('❌ Valor no encontrado en cache');
        process.exit(1);
      }
      break;
      
    case 'set':
      if (!key) {
        console.error('❌ Se requiere --key para la acción set');
        process.exit(1);
      }
      
      // Leer valor desde stdin
      let inputData = '';
      process.stdin.on('data', chunk => inputData += chunk);
      process.stdin.on('end', () => {
        try {
          const value = JSON.parse(inputData);
          const success = cache.set(key, value, ttl);
          process.exit(success ? 0 : 1);
        } catch (error) {
          console.error('❌ Error parseando JSON:', error.message);
          process.exit(1);
        }
      });
      break;
      
    case 'clear':
      const cleared = cache.clear();
      console.log(`✅ Cache limpiado: ${cleared} entradas eliminadas`);
      break;
      
    case 'cleanup':
      const result = cache.cleanup();
      console.log(`✅ Limpieza completada: ${result.cleanedCount} entradas, ${cache.formatBytes(result.freedSpace)} liberados`);
      break;
      
    case 'stats':
    default:
      const stats = cache.getStats();
      console.log('📊 Estadísticas del Cache:');
      console.log(JSON.stringify(stats, null, 2));
      break;
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main();
}

module.exports = { CacheManager, AuditCacheHelper, CACHE_CONFIG };