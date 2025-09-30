# Contributing to SmartEdify Platform

¡Gracias por tu interés en contribuir al proyecto SmartEdify! Esta guía define el flujo completo de trabajo, estándares de calidad y buenas prácticas para contribuir efectivamente al proyecto.

## 📋 Tabla de contenidos

- [Código de conducta](#código-de-conducta)
- [Configuración del entorno](#configuración-del-entorno)
- [Flujo de trabajo](#flujo-de-trabajo)
- [Estándares de código](#estándares-de-código)
- [Pruebas](#pruebas)
- [Documentación](#documentación)
- [Seguridad](#seguridad)
- [Proceso de revisión](#proceso-de-revisión)

## 🤝 Código de conducta

Este proyecto adhiere a un código de conducta profesional. Al participar, te comprometes a mantener un ambiente respetuoso y colaborativo.

### Comportamientos esperados:

- Usar lenguaje inclusivo y respetuoso
- Ser receptivo a críticas constructivas
- Enfocarse en lo que es mejor para la comunidad
- Mostrar empatía hacia otros miembros

### Comportamientos inaceptables:

- Lenguaje o imágenes sexualizadas
- Comentarios despectivos o ataques personales
- Acoso público o privado
- Publicar información privada sin consentimiento

## 🛠️ Configuración del entorno

### Prerrequisitos

- **Node.js** >= 18.x
- **npm** >= 8.x
- **Docker** >= 20.x
- **PostgreSQL** >= 13.x
- **Git** >= 2.30.x

### Configuración inicial

1. **Fork y clonar el repositorio:**

   ```bash
   git clone https://github.com/tu-usuario/smartedify_app.git
   cd smartedify_app
   ```

2. **Configurar upstream:**

   ```bash
   git remote add upstream https://github.com/smartedify/smartedify_app.git
   ```

3. **Instalar dependencias:**

   ```bash
   # Para el Identity Service
   cd services/support/identity-service
   npm install
   ```

4. **Configurar entorno de desarrollo:**

   ```bash
   # Copiar archivo de configuración
   cp .env.example .env

   # Iniciar base de datos de prueba
   docker-compose -f docker-compose.test.yml up -d

   # Ejecutar migraciones
   npm run db:run-migrations
   ```

5. **Verificar instalación:**
   ```bash
   npm run validate
   ```

## 🔄 Flujo de trabajo

### 1. Preparación

Antes de comenzar cualquier trabajo:

```bash
# Actualizar tu fork
git checkout main
git fetch upstream
git merge upstream/main
git push origin main
```

### 2. Creación de rama

Crea una rama descriptiva para tu trabajo:

```bash
# Para nuevas funcionalidades
git checkout -b feature/descripcion-funcionalidad

# Para correcciones
git checkout -b fix/descripcion-problema

# Para documentación
git checkout -b docs/descripcion-actualizacion
```

### 3. Desarrollo

Durante el desarrollo:

- **Commits frecuentes:** Haz commits pequeños y descriptivos
- **Pruebas continuas:** Ejecuta pruebas regularmente
- **Validación local:** Usa `npm run validate` antes de push

```bash
# Desarrollo iterativo
git add .
git commit -m "feat(auth): add DPoP proof validation"

# Validación antes de push
npm run validate
git push origin feature/descripcion-funcionalidad
```

### 4. Pull Request

1. **Crear PR:** Usa el template proporcionado
2. **Completar checklist:** Verifica todos los elementos
3. **Solicitar revisión:** Asigna reviewers apropiados
4. **Responder feedback:** Implementa cambios solicitados

### 5. Post-merge

Después del merge:

```bash
# Limpiar rama local
git checkout main
git pull upstream main
git branch -d feature/descripcion-funcionalidad

# Actualizar fork
git push origin main
```

## 📝 Estándares de código

### Convenciones de nomenclatura

#### Archivos y directorios

```
kebab-case para archivos: user-service.ts
camelCase para variables: userName
PascalCase para clases: UserService
UPPER_CASE para constantes: MAX_RETRY_ATTEMPTS
```

#### Estructura de archivos

```
src/
├── modules/
│   └── auth/
│       ├── auth.controller.ts
│       ├── auth.service.ts
│       ├── auth.module.ts
│       ├── dto/
│       ├── entities/
│       └── guards/
```

### TypeScript

#### Configuración estricta

```typescript
// tsconfig.json debe incluir:
{
  "strict": true,
  "noImplicitAny": true,
  "strictNullChecks": true,
  "noImplicitReturns": true
}
```

#### Tipos explícitos

```typescript
// ✅ Correcto
interface UserCreateRequest {
  email: string;
  password: string;
  tenantId: string;
}

async function createUser(request: UserCreateRequest): Promise<User> {
  // implementación
}

// ❌ Incorrecto
async function createUser(request: any): Promise<any> {
  // implementación
}
```

### NestJS

#### Decoradores y estructura

```typescript
@Controller("auth")
@UseGuards(DpopGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("token")
  @HttpCode(HttpStatus.OK)
  async token(
    @Body() tokenRequest: TokenRequestDto,
    @Headers("DPoP") dpopProof: string
  ): Promise<TokenResponse> {
    return this.authService.exchangeCodeForTokens(tokenRequest, dpopProof);
  }
}
```

#### DTOs y validación

```typescript
export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
  password: string;

  @IsUUID()
  tenantId: string;
}
```

### Base de datos

#### Entidades TypeORM

```typescript
@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true })
  @Index()
  email: string;

  @Column({ name: "tenant_id" })
  @Index()
  tenantId: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
```

#### Migraciones

```typescript
export class CreateUserTable1640995200000 implements MigrationInterface {
  name = "CreateUserTable1640995200000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "users",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "gen_random_uuid()",
          },
          // más columnas...
        ],
        indices: [
          {
            name: "IDX_USER_EMAIL",
            columnNames: ["email"],
            isUnique: true,
          },
        ],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("users");
  }
}
```

## 🧪 Pruebas

### Estrategia de pruebas

#### Pirámide de pruebas

```
    /\
   /  \     E2E Tests (10%)
  /____\
 /      \   Integration Tests (20%)
/________\  Unit Tests (70%)
```

### Pruebas unitarias

```typescript
describe("AuthService", () => {
  let service: AuthService;
  let mockUserService: jest.Mocked<UsersService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findByEmail: jest.fn(),
            create: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    mockUserService = module.get(UsersService);
  });

  describe("validateUser", () => {
    it("should return user when credentials are valid", async () => {
      // Arrange
      const email = "test@example.com";
      const password = "validPassword";
      const user = { id: "1", email, password: "hashedPassword" };

      mockUserService.findByEmail.mockResolvedValue(user);
      jest.spyOn(service, "validatePassword").mockResolvedValue(true);

      // Act
      const result = await service.validateUser(email, password);

      // Assert
      expect(result).toEqual(user);
      expect(mockUserService.findByEmail).toHaveBeenCalledWith(email);
    });
  });
});
```

### Pruebas de integración

```typescript
describe("Auth Integration", () => {
  let app: INestApplication;
  let authService: AuthService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    authService = moduleFixture.get<AuthService>(AuthService);
    await app.init();
  });

  it("should complete OAuth flow", async () => {
    // Test completo del flujo OAuth
    const parResponse = await request(app.getHttpServer())
      .post("/oauth/par")
      .send({
        code_challenge: "challenge",
        code_challenge_method: "S256",
        redirect_uri: "https://client.example.com/callback",
        scope: "openid profile",
      })
      .expect(201);

    expect(parResponse.body.request_uri).toBeDefined();
  });
});
```

### Pruebas E2E

```typescript
describe("Complete Authentication Flow (e2e)", () => {
  let app: INestApplication;
  let setup: TestModuleSetup;

  beforeAll(async () => {
    setup = await createTestModule();
    app = setup.app;
  });

  it("should complete full OAuth 2.1 flow with DPoP", async () => {
    // 1. PAR Request
    const parResponse = await request(app.getHttpServer())
      .post("/oauth/par")
      .send(parPayload)
      .expect(201);

    // 2. Authorization
    const authResponse = await request(app.getHttpServer())
      .get("/oauth/authorize")
      .query({
        request_uri: parResponse.body.request_uri,
        client_id: "test-client",
      })
      .expect(302);

    // 3. Token Exchange
    const dpopProof = await createDpopProof("POST", "/oauth/token");
    const tokenResponse = await request(app.getHttpServer())
      .post("/oauth/token")
      .set("DPoP", dpopProof)
      .send(tokenPayload)
      .expect(200);

    expect(tokenResponse.body.access_token).toBeDefined();
    expect(tokenResponse.body.token_type).toBe("DPoP");
  });
});
```

### Cobertura de pruebas

Mantén estos umbrales mínimos:

- **Líneas:** 80%
- **Funciones:** 80%
- **Ramas:** 75%
- **Statements:** 80%

```bash
# Verificar cobertura
npm run test:cov

# Generar reporte HTML
npm run test:cov -- --coverageReporters=html
```

## 📚 Documentación

### README

Cada servicio debe tener un README completo:

```markdown
# Service Name

## Overview

Breve descripción del servicio

## Features

- Lista de características principales

## Getting Started

### Prerequisites

### Installation

### Configuration

## API Documentation

### Endpoints

### Authentication

### Examples

## Testing

### Unit Tests

### Integration Tests

### E2E Tests

## Deployment

### Environment Variables

### Docker

### Production Considerations
```

### Comentarios de código

```typescript
/**
 * Validates a DPoP proof according to RFC 9449
 *
 * @param dpopProof - The DPoP JWT proof
 * @param httpMethod - HTTP method of the request
 * @param httpUrl - Full URL of the request
 * @param options - Additional validation options
 * @returns Validated DPoP proof payload
 * @throws UnauthorizedException if proof is invalid
 */
async validateDpopProof(
  dpopProof: string,
  httpMethod: string,
  httpUrl: string,
  options?: ValidateDpopProofOptions,
): Promise<ValidatedDpopProof> {
  // Implementation...
}
```

### OpenAPI/Swagger

```typescript
@ApiOperation({
  summary: 'Exchange authorization code for tokens',
  description: 'Implements OAuth 2.1 token endpoint with DPoP support',
})
@ApiResponse({
  status: 200,
  description: 'Tokens issued successfully',
  type: TokenResponse,
})
@ApiResponse({
  status: 400,
  description: 'Invalid request parameters',
  type: ErrorResponse,
})
@Post('token')
async token(@Body() request: TokenRequest): Promise<TokenResponse> {
  // Implementation...
}
```

## 🔒 Seguridad

### Principios de seguridad

1. **Principio de menor privilegio**
2. **Defensa en profundidad**
3. **Fail securely**
4. **No confiar en la entrada del usuario**
5. **Usar componentes seguros**

### Validación de entrada

```typescript
// ✅ Correcto - Validación exhaustiva
@IsEmail()
@IsNotEmpty()
@MaxLength(255)
@Transform(({ value }) => value?.toLowerCase().trim())
email: string;

@IsString()
@MinLength(8)
@MaxLength(128)
@Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
password: string;
```

### Manejo de secretos

```typescript
// ✅ Correcto - Usar variables de entorno
const jwtSecret = this.configService.get<string>("JWT_SECRET");

// ❌ Incorrecto - Secreto hardcodeado
const jwtSecret = "mi-secreto-super-secreto";
```

### Logging seguro

```typescript
// ✅ Correcto - No loggear información sensible
this.logger.log("User authentication attempt", {
  userId: user.id,
  email: user.email.replace(/(.{2}).*(@.*)/, "$1***$2"),
  timestamp: new Date().toISOString(),
});

// ❌ Incorrecto - Loggear información sensible
this.logger.log("User login", {
  password: user.password, // ¡Nunca!
  token: accessToken, // ¡Nunca!
});
```

## 👥 Proceso de revisión

### Criterios de revisión

#### Funcionalidad

- [ ] El código hace lo que se supone que debe hacer
- [ ] La lógica es correcta y eficiente
- [ ] Los casos edge están manejados

#### Diseño

- [ ] El código sigue los patrones establecidos
- [ ] La arquitectura es apropiada
- [ ] Las responsabilidades están bien separadas

#### Legibilidad

- [ ] El código es fácil de entender
- [ ] Los nombres son descriptivos
- [ ] Los comentarios son útiles y necesarios

#### Mantenibilidad

- [ ] El código es fácil de modificar
- [ ] No introduce deuda técnica
- [ ] Sigue principios SOLID

### Como reviewer

1. **Sé constructivo:** Proporciona feedback específico y útil
2. **Sé oportuno:** Revisa PRs dentro de 24 horas
3. **Sé exhaustivo:** Revisa tanto funcionalidad como estilo
4. **Sé educativo:** Explica el "por qué" de tus sugerencias

### Como autor

1. **Sé receptivo:** Acepta feedback constructivamente
2. **Sé responsivo:** Responde a comentarios rápidamente
3. **Sé claro:** Explica decisiones de diseño complejas
4. **Sé proactivo:** Haz auto-revisión antes de solicitar revisión

## 🚀 Despliegue

### Ambientes

- **Development:** Rama `develop`
- **Staging:** Rama `staging`
- **Production:** Rama `main`

### Proceso de release

1. **Feature complete:** Todas las features en `develop`
2. **Release branch:** Crear `release/vX.Y.Z`
3. **Testing:** Pruebas exhaustivas en staging
4. **Merge to main:** Después de aprobación
5. **Tag release:** `git tag vX.Y.Z`
6. **Deploy:** Despliegue automático a producción

### Rollback

En caso de problemas:

1. **Identificar problema:** Monitoreo y alertas
2. **Decidir rollback:** Evaluación de impacto
3. **Ejecutar rollback:** Proceso automatizado
4. **Verificar:** Confirmar que el problema se resolvió
5. **Post-mortem:** Análisis y mejoras

## 📞 Soporte

### Canales de comunicación

- **Issues:** Para bugs y feature requests
- **Discussions:** Para preguntas y discusiones
- **Slack:** Para comunicación rápida (si aplica)
- **Email:** Para temas sensibles

### Recursos adicionales

- [Documentación técnica](../docs/)
- [Guías de API](../docs/api/)
- [Arquitectura del sistema](../docs/architecture/)
- [Guías de seguridad](../docs/security/)

---

¡Gracias por contribuir a SmartEdify! Tu trabajo ayuda a construir una plataforma educativa mejor para todos. 🚀
