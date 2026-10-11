# TutorLink

Backend del taller de Computación en Internet III (NestJS + PostgreSQL). TutorLink es un marketplace de tutorías universitarias: un estudiante busca un tutor por materia, universidad y tarifa, reserva una sesión y, si quiere, deja una reseña cuando la sesión terminó.

**Equipo:** Miguel Pérez, Johan Suarez, Juan Sebastián Rodríguez Legarda
**Entrega del taller:** 13 de octubre de 2026

La API escucha en el puerto **9000** con el prefijo global `tutorlink`. La documentación interactiva (Swagger UI) está en **`http://localhost:9000/docs`**. Un usuario nuevo entra siempre como `student`. Los roles son `student`, `tutor` y `admin`.

## Qué ya está hecho

Persistencia con TypeORM contra PostgreSQL y cuatro módulos funcionales: usuarios, materias, tutores y reservas. Más seed, Swagger, colección Postman, pruebas de tutores/reservas y un workflow de CI.

### Usuarios (`user`)

Registro, login, logout y autorización por roles.

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

### Materias (`subject`)

No depende de tutores, reservas ni reseñas. Crear, editar y borrar es solo admin. Listar y ver una materia exige estar autenticado.

| Método | Ruta | Quién |
|---|---|---|
| POST | `/tutorlink/subject` | Admin. Body: `name`, `university`, `semester`. |
| GET | `/tutorlink/subject` | Autenticado. Filtros: `university`, `semester`, `search`, `limit`, `skip`. |
| GET | `/tutorlink/subject/:id` | Autenticado. |
| PATCH | `/tutorlink/subject/:id` | Admin. |
| DELETE | `/tutorlink/subject/:id` | Admin. |

No puede repetirse la misma materia en la misma universidad y el mismo semestre. `search` busca por nombre, sin importar mayúsculas.

### Tutores (`tutor`)

El perfil no es el usuario: es una entidad aparte (`tutor_profile`) ligada al usuario con rol `tutor`.

| Método | Ruta | Quién |
|---|---|---|
| PUT | `/tutorlink/tutor/me` | Tutor. Arma su perfil: bio, tarifa, historial y materias. Crea o reemplaza. |
| GET | `/tutorlink/tutor` | Autenticado. Filtros: `subjectId`, `university`, `maxRate`, `verified`, `limit`, `skip`. |
| GET | `/tutorlink/tutor/:id` | Autenticado. |
| PATCH | `/tutorlink/tutor/:id/verify` | Admin. Marca el perfil como verificado. |

El admin asigna el rol `tutor` con `PATCH /tutorlink/user/:id/roles` antes de que esa persona pueda crear su perfil. Si alguna materia del perfil no existe, responde 404.

### Reservas (`booking`)

Estados: `PENDING`, `CONFIRMED`, `CANCELLED`, `COMPLETED`.

| Método | Ruta | Quién |
|---|---|---|
| POST | `/tutorlink/booking` | Student. Body: `tutorProfileId`, `subjectId`, `startAt`, `endAt` (ISO). |
| GET | `/tutorlink/booking/mine` | El estudiante o el tutor de esa reserva. Filtro opcional `status`. |
| PATCH | `/tutorlink/booking/:id/confirm` | El tutor dueño. Pasa `PENDING` a `CONFIRMED`. |
| PATCH | `/tutorlink/booking/:id/cancel` | El dueño de la reserva (estudiante o tutor). Desde `PENDING` o `CONFIRMED`. |
| PATCH | `/tutorlink/booking/:id/complete` | El tutor dueño. Pasa `CONFIRMED` a `COMPLETED`. |

Reglas:

- El tutor tiene que dictar la materia reservada (si no, 400).
- No puede haber cruce de horario con otra reserva activa de ese tutor (si lo hay, 409).
- Las fechas deben ser futuras y `endAt` posterior a `startAt`.
- Solo el dueño de la reserva la modifica (si no, 403).

### Seed

`GET /tutorlink/seed?key=SEED_KEY`. Borra en orden `booking`, `tutor_profile`, `subject`, `user` y carga el admin (de `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_FULL_NAME`), 4 materias, 2 tutores verificados y 2 estudiantes. Sin la clave correcta responde 401. Las contraseñas se hashean con `UserService.encryptPassword`, el mismo método del registro.

Credenciales de prueba (todas con `Secreta123`, salvo el admin): `tutor1@example.com`, `tutor2@example.com`, `ana@example.com`, `luis@example.com`.

### Swagger

- `main.ts`: `DocumentBuilder().addBearerAuth()` y `SwaggerModule.setup('docs', ...)` (UI en `/docs`).
- `@ApiTags` en cada controller, `@ApiProperty` en DTOs y entidades.
- `@ApiBearerAuth()` vive dentro del decorador `@Auth()`, así las rutas protegidas quedan marcadas solas.

### Postman

Colección en `postman/TutorLink.postman_collection.json`, con variables `baseUrl` (`http://localhost:9000/tutorlink`) y `token` (se guarda solo al registrarse o iniciar sesión). Cubre usuarios, materias, tutores, reservas y seed. Para los flujos con otro rol, basta iniciar sesión con ese usuario (el token se sobrescribe).

### Pruebas

Hay pruebas unitarias (Vitest, sin base de datos) de usuarios, materias, tutores y reservas, y pruebas de integración (Supertest, con base de datos). Un workflow de GitHub Actions (`.github/workflows/tests.yml`) instala, compila y corre las unitarias en cada push y en cada pull request.

| Qué | Cómo se corre |
|---|---|
| Unitarias | `npm test` |
| Cobertura | `npm run test:cov` |
| Integración (seed, usuarios, materias, tutores y reservas) | Con la base arriba: `RUN_E2E=true npm run test:e2e` |

Las de integración se saltan solas si no está `RUN_E2E=true`, porque necesitan PostgreSQL y el `.env`. Ese comando también ejecuta el seed y borra los datos de la base local.

## Cómo correrlo

Hace falta Node.js y Docker. Desde la raíz del proyecto:

### 1. Variables de entorno

Crear un `.env` en la raíz (no se sube a git) con:

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

### 2. Instalar, base de datos y API

```bash
npm install
docker compose up -d db
npm run start:dev
```

La API queda en `http://localhost:9000/tutorlink`. `start:dev` recompila al guardar.

`docker compose up -d` (sin `db`) también intenta construir la API dentro de Docker. El `package-lock.json` está sincronizado con `package.json` (incluye un `overrides` que fija un solo TypeScript para todo el árbol, sin eso `npm ci` falla). Para desarrollar, Nest se corre en la máquina y Docker solo presta PostgreSQL.

PostgreSQL aplica `DB_PASSWORD` únicamente la primera vez que crea el volumen `pgdata`. Si el contenedor ya tenía datos y la contraseña del `.env` cambió, el login a la base sigue fallando. En ese caso hay que recrear el volumen o cambiar la contraseña del usuario dentro del contenedor.

`synchronize: true` en `app.module.ts` crea y altera tablas al arrancar. Sirve en desarrollo. No se deja así en producción.

### 3. Swagger

Con la API corriendo, abrir:

[http://localhost:9000/docs](http://localhost:9000/docs)

Ahí están todos los endpoints. En las rutas protegidas, **Authorize** pide el JWT (el mismo que devuelve el login). No hace falta el prefijo `Bearer`: Swagger lo agrega.

### 4. Datos iniciales

Solo en la base local, y solo cuando la API ya está arriba:

```bash
curl "http://localhost:9000/tutorlink/seed?key=una_clave_para_el_seed"
```

Debe responder `SEED EXECUTED`. La misma petición está en la carpeta Seed de Postman. Vuelve a borrar y recargar usuarios, materias, tutores y reservas.

### 5. Pruebas unitarias

No necesitan la base ni el servidor. Se pueden correr con la API apagada:

```bash
npm test
```

Para ver el porcentaje de cobertura:

```bash
npm run test:cov
```

### 6. Postman

Importar `postman/TutorLink.postman_collection.json` en Postman. La colección ya trae `baseUrl` (`http://localhost:9000/tutorlink`). Al iniciar sesión, el script guarda el token. El orden sugerido está en la descripción de la colección: Seed, login de admin, materias, tutores y reservas.

### 7. Probar un flujo a mano

Con el servidor arriba y el seed ejecutado:

```bash
curl "http://localhost:9000/tutorlink/seed?key=una_clave_para_el_seed"
```

Debe responder `SEED EXECUTED`. La misma petición está en la carpeta Seed de Postman.

4. Probar cada funcionalidad, en orden:

```bash
# 1. Entrar como admin (token de la respuesta -> Authorization: Bearer <token>)
curl -X POST http://localhost:9000/tutorlink/user/auth \
  -H "Content-Type: application/json" \
  -d '{ "email": "admin@tutorlink.com", "password": "tu_password_admin" }'

# 2. Crear una materia (admin)
curl -X POST http://localhost:9000/tutorlink/subject \
  -H "Authorization: Bearer <token_admin>" -H "Content-Type: application/json" \
  -d '{ "name": "Cálculo I", "university": "ICESI", "semester": "3" }'

# 3. Dar rol tutor a un usuario (admin; el id sale del login o del listado)
curl -X PATCH http://localhost:9000/tutorlink/user/<id>/roles \
  -H "Authorization: Bearer <token_admin>" -H "Content-Type: application/json" \
  -d '{ "roles": ["tutor"] }'

# 4. Crear el perfil del tutor (con el token del tutor)
curl -X PUT http://localhost:9000/tutorlink/tutor/me \
  -H "Authorization: Bearer <token_tutor>" -H "Content-Type: application/json" \
  -d '{ "bio": "Estudiante de ingeniería con 3 semestres dando tutorías.",
        "hourlyRate": 15000,
        "academicHistory": "Monitor de Cálculo I (2025), promedio 4.5.",
        "university": "ICESI",
        "subjectIds": ["<id_materia>"] }'

# 5. Verificar al tutor (admin)
curl -X PATCH http://localhost:9000/tutorlink/tutor/<id_perfil>/verify \
  -H "Authorization: Bearer <token_admin>"

# 6. Reservar (con el token del estudiante)
curl -X POST http://localhost:9000/tutorlink/booking \
  -H "Authorization: Bearer <token_estudiante>" -H "Content-Type: application/json" \
  -d '{ "tutorProfileId": "<id_perfil>", "subjectId": "<id_materia>",
        "startAt": "2026-10-20T14:00:00.000Z", "endAt": "2026-10-20T15:00:00.000Z" }'

# 7. Confirmar y completar (con el token del tutor)
curl -X PATCH http://localhost:9000/tutorlink/booking/<id_reserva>/confirm \
  -H "Authorization: Bearer <token_tutor>"
curl -X PATCH http://localhost:9000/tutorlink/booking/<id_reserva>/complete \
  -H "Authorization: Bearer <token_tutor>"
```

Ese mismo flujo está en Swagger y en la colección de Postman.

## Qué falta

### Reseñas (`review`, opcional)

Solo se puede reseñar una reserva `COMPLETED` propia. Una reseña por reserva. El módulo, controller y service existen en esqueleto (`src/review/`).

### Cobertura global

La consigna pide al menos **80%** de cobertura de todo el código. Usuarios y materias ya tienen pruebas de servicio, controller, guard y JWT. Tutores y reservas tienen pruebas de servicio. Sigue faltando cubrir seed, reseñas y los controllers de tutor y booking para llegar a ese 80% sobre todo `src`. Se mide con `npm run test:cov`.

### Despliegue

- Desplegar la API en un servicio en la nube.
- Un pipeline que pruebe y despliegue (hoy el workflow solo instala, compila y corre unitarias).
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
│   │   ├── user.controller.spec.ts
│   │   ├── user.service.ts
│   │   ├── user.service.spec.ts
│   │   ├── decorators/
│   │   │   ├── auth.decorator.ts
│   │   │   ├── get-user.decorator.ts
│   │   │   └── role-protected.decorator.ts
│   │   ├── dto/
│   │   │   ├── login.dto.ts
│   │   │   ├── register.dto.ts
│   │   │   ├── update-roles.dto.ts
│   │   │   └── auth-response.dto.ts
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
│   │   ├── subject.controller.spec.ts
│   │   ├── subject.service.ts
│   │   ├── subject.service.spec.ts
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
│   │   ├── tutor.service.spec.ts
│   │   ├── dto/
│   │   │   ├── create-tutor-profile.ts
│   │   │   ├── update-tutor-profile.ts
│   │   │   └── filter-tutor.dto.ts
│   │   └── entities/
│   │       └── tutor-profile.entity.ts
│   ├── booking/
│   │   ├── booking.module.ts
│   │   ├── booking.controller.ts
│   │   ├── booking.service.ts
│   │   ├── booking.service.spec.ts
│   │   ├── dto/
│   │   │   ├── create-booking.ts
│   │   │   ├── update-booking.ts
│   │   │   └── filter-booking.dto.ts
│   │   ├── entities/
│   │   │   └── booking.entity.ts
│   │   └── enums/
│   │       └── booking-status.enum.ts
│   ├── review/
│   │   ├── review.module.ts
│   │   ├── review.controller.ts
│   │   ├── review.service.ts
│   │   ├── dto/
│   │   │   └── create-review.ts
│   │   └── entities/
│   │       └── review.entity.ts
│   └── seed/
│       ├── seed.module.ts
│       ├── seed.controller.ts
│       ├── seed.service.ts
│       └── data/
│           └── seed.data.ts
├── test/
│   ├── app.e2e-spec.ts
│   ├── user-subject.e2e-spec.ts
│   └── tutor-booking.e2e-spec.ts
├── postman/
│   └── TutorLink.postman_collection.json
├── docs/
│   ├── sesion-tutor-booking.md
│   ├── Enunciado.pdf
│   └── ...
├── .github/workflows/
│   └── tests.yml
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
├── vitest.config.ts
└── vitest.config.e2e.ts
```
