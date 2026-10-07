# TutorLink

Backend del taller de Computación en Internet III (NestJS + PostgreSQL). TutorLink es un marketplace de tutorías universitarias: un estudiante busca un tutor por materia, universidad y tarifa, reserva una sesión y, si quiere, deja una reseña cuando la sesión terminó.

La API escucha en el puerto **9000** con el prefijo global `tutorlink`. Un usuario nuevo entra siempre como `student`. Los roles son `student`, `tutor` y `admin`.

## Qué ya está hecho

Persistencia con TypeORM contra PostgreSQL y el módulo de usuarios: registro, login, logout y autorización por roles.

| Método | Ruta | Quién |
|---|---|---|
| POST | `/tutorlink/user/signup` | Público. Crea un estudiante. |
| POST | `/tutorlink/user/auth` | Público. Devuelve el JWT. |
| GET | `/tutorlink/user/me` | Cualquier sesión. |
| POST | `/tutorlink/user/logout` | Cualquier sesión. Invalida el token. |
| GET | `/tutorlink/user` | Admin. Acepta `limit` y `skip`. |
| GET | `/tutorlink/user/:id` | Admin. |
| PATCH | `/tutorlink/user/:id/roles` | Admin. Body: `{ "roles": ["tutor"] }`. |
| DELETE | `/tutorlink/user/:id` | Admin. Desactiva la cuenta. No puede desactivarse a sí mismo ni quitarse el rol admin. |

El logout sube `tokenVersion` en el usuario. Ese número viaja dentro del JWT. Si no coincide, o si `isActive` es falso, la ruta protegida responde 401. Las rutas protegidas usan el header `Authorization: Bearer <token>`. El decorador `@Auth()` ya aplica el guard de JWT y, si se le pasan roles, el guard de roles.

También está el módulo de materias. No depende de tutores, reservas ni reseñas. Crear, editar y borrar es solo admin. Listar y ver una materia exige estar autenticado.

| Método | Ruta | Quién |
|---|---|---|
| POST | `/tutorlink/subject` | Admin. Body: `name`, `university`, `semester`. |
| GET | `/tutorlink/subject` | Autenticado. Filtros: `university`, `semester`, `search`, `limit`, `skip`. |
| GET | `/tutorlink/subject/:id` | Autenticado. |
| PATCH | `/tutorlink/subject/:id` | Admin. |
| DELETE | `/tutorlink/subject/:id` | Admin. |

No puede repetirse la misma materia en la misma universidad y el mismo semestre. `search` busca por nombre, sin importar mayúsculas.

## Cómo correrlo

1. Crear un `.env` en la raíz (no se sube a git) con:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=tutorlink
DB_USERNAME=postgres
DB_PASSWORD=tu_password
JWT_SECRET=un_secreto_sin_signo_pesos
JWT_EXPIRES_IN=1h
ADMIN_EMAIL=admin@tutorlink.com
ADMIN_PASSWORD=tu_password_admin
ADMIN_FULL_NAME=Administrador TutorLink
SEED_KEY=una_clave_para_el_seed
```

2. Instalar dependencias y levantar solo la base:

```bash
npm install
docker compose up -d db
npm run start:dev
```

`docker compose up -d` (sin `db`) también intenta construir la API dentro de Docker. Hoy esa imagen falla porque `npm ci` del Dockerfile no coincide con el `package-lock.json`. Para desarrollar, Nest se corre en la máquina y Docker solo presta PostgreSQL.

PostgreSQL aplica `DB_PASSWORD` únicamente la primera vez que crea el volumen `pgdata`. Si el contenedor ya tenía datos y la contraseña del `.env` cambió, el login a la base sigue fallando. En ese caso hay que recrear el volumen o cambiar la contraseña del usuario dentro del contenedor.

`synchronize: true` en `app.module.ts` crea y altera tablas al arrancar. Sirve en desarrollo. No se deja así en producción.

## Qué falta

La entrega del taller es el **13 de octubre de 2026**. Abajo está lo que todavía falta implementar. Los módulos nuevos ya están importados en `app.module.ts` y deben reutilizar `@Auth()` del módulo `user`.

`tutor`, `booking` y `review` ya tienen módulo, controller y service de Nest, más las carpetas `dto/` y `entities/`. Todavía no tienen lógica. `booking` ya define el enum `BookingStatus`.

### Tutores (`tutor`)

El perfil no es el usuario: es una entidad aparte (`tutor_profile`) ligada al usuario con rol `tutor`.

| Método | Ruta | Quién |
|---|---|---|
| PUT | `/tutorlink/tutor/me` | Tutor. Arma su perfil: bio, tarifa, historial y materias. |
| GET | `/tutorlink/tutor` | Autenticado. Filtros: materia, universidad, tarifa máxima y verificado. |
| GET | `/tutorlink/tutor/:id` | Autenticado |
| PATCH | `/tutorlink/tutor/:id/verify` | Admin |

El admin asigna el rol `tutor` con `PATCH /tutorlink/user/:id/roles` antes de que esa persona pueda crear su perfil.

### Reservas (`booking`)

Estados: `PENDING`, `CONFIRMED`, `CANCELLED`, `COMPLETED`.

| Método | Ruta | Quién |
|---|---|---|
| POST | `/tutorlink/booking` | Student |
| GET | `/tutorlink/booking/mine` | El estudiante o el tutor de esa reserva |
| PATCH | `/tutorlink/booking/:id/confirm` | El tutor dueño |
| PATCH | `/tutorlink/booking/:id/cancel` | El dueño de la reserva |
| PATCH | `/tutorlink/booking/:id/complete` | El tutor dueño |

Reglas:

- El tutor tiene que dictar la materia reservada.
- No puede haber cruce de horario con otra reserva activa de ese tutor.
- Solo el dueño de la reserva la modifica.

### Reseñas (`review`, opcional)

Solo se puede reseñar una reserva `COMPLETED` propia. Una reseña por reserva.

### Seed

Endpoint o script que cargue datos iniciales y permita repetir la carga.

- El admin sale de `ADMIN_EMAIL`, `ADMIN_PASSWORD` y `ADMIN_FULL_NAME`. Proteger la ruta con `SEED_KEY`.
- Cargar algunas materias, 2 tutores y 2 estudiantes.
- Borrar en este orden, por las llaves foráneas: `booking`, `tutor_profile`, `subject`, `user`.
- Hashear contraseñas con `UserService.encryptPassword`, el mismo método del registro.

### Swagger

En `main.ts`:

- `DocumentBuilder().addBearerAuth()`
- `SwaggerModule.setup('docs', ...)` para servir la documentación en `/docs`

En el código:

- `@ApiTags` en cada controller.
- `@ApiProperty` en los DTO.
- `@ApiBearerAuth()` dentro del decorador `@Auth()`, para no marcarlo ruta por ruta.

### Postman

Colección JSON en el repo, con variables `baseUrl` (`http://localhost:9000/tutorlink`) y `token`. Tiene que poder ejecutarse a mano cada flujo: usuarios, materias, tutores, reservas y, si se hace, reseñas.

### Pruebas

Quedan para otro momento del proyecto. La consigna pide pruebas unitarias y de integración (Vitest y Supertest ya están en el repo) con al menos **80%** de cobertura. `test/app.e2e-spec.ts` es el esqueleto de Nest y todavía no prueba TutorLink.

### GitHub Actions y despliegue

- Un workflow que ejecute las pruebas antes del push.
- Desplegar la API en un servicio en la nube.
- Un pipeline que pruebe y despliegue.
- En el informe de la entrega: URL del repositorio, URL de la app y cómo se probaron los endpoints.

### Informe

Documento para la tarea de Intu. Describe cada endpoint (parámetros y respuestas) y explica autenticación, autorización y persistencia. No reemplaza este README.

## Estructura de carpetas

No se listan `node_modules/`, `dist/` ni `.git/`. `.env` existe en local y está en `.gitignore`.

```text
Compu3-TallerNest_TutorLink/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── common/
│   │   └── dto/
│   │       └── pagination.dto.ts
│   ├── user/
│   │   ├── user.module.ts
│   │   ├── user.controller.ts
│   │   ├── user.service.ts
│   │   ├── decorators/
│   │   │   ├── auth.decorator.ts
│   │   │   ├── get-user.decorator.ts
│   │   │   └── role-protected.decorator.ts
│   │   ├── dto/
│   │   │   ├── login.dto.ts
│   │   │   ├── register.dto.ts
│   │   │   └── update-roles.dto.ts
│   │   ├── entities/
│   │   │   └── user.entity.ts
│   │   ├── enums/
│   │   │   └── user-role.enum.ts
│   │   ├── guards/
│   │   │   └── user-role.guard.ts
│   │   ├── interfaces/
│   │   │   └── jwt.interface.ts
│   │   └── strategies/
│   │       └── jwt.strategy.ts
│   ├── subject/
│   │   ├── subject.module.ts
│   │   ├── subject.controller.ts
│   │   ├── subject.service.ts
│   │   ├── dto/
│   │   │   ├── create-subject.dto.ts
│   │   │   ├── update-subject.dto.ts
│   │   │   └── filter-subject.dto.ts
│   │   └── entities/
│   │       └── subject.entity.ts
│   ├── tutor/
│   │   ├── tutor.module.ts
│   │   ├── tutor.controller.ts
│   │   ├── tutor.service.ts
│   │   ├── dto/
│   │   │   ├── create-tutor-profile.ts
│   │   │   └── update-tutor-profile.ts
│   │   └── entities/
│   │       └── tutor-profile.entity.ts
│   ├── booking/
│   │   ├── booking.module.ts
│   │   ├── booking.controller.ts
│   │   ├── booking.service.ts
│   │   ├── dto/
│   │   │   ├── create-booking.ts
│   │   │   └── update-booking.ts
│   │   ├── entities/
│   │   │   └── booking.entity.ts
│   │   └── enums/
│   │       └── booking-status.enum.ts
│   └── review/
│       ├── review.module.ts
│       ├── review.controller.ts
│       ├── review.service.ts
│       ├── dto/
│       │   └── create-review.ts
│       └── entities/
│           └── review.entity.ts
├── test/
│   └── app.e2e-spec.ts
├── .dockerignore
├── .gitignore
├── .prettierrc
├── docker-compose.yml
├── Dockerfile
├── nest-cli.json
├── oxlint.json
├── package.json
├── package-lock.json
├── tsconfig.json
├── tsconfig.build.json
├── tsconfig.build.tsbuildinfo
├── vitest.config.ts
└── vitest.config.e2e.ts
```

Todavía no existen el seed, la colección de Postman ni el workflow de GitHub Actions:

```text
src/seed/
├── seed.module.ts
├── seed.controller.ts
├── seed.service.ts
└── data/
postman/
.github/workflows/
```
