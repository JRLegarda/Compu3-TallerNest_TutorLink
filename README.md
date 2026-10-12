# TutorLink

Backend del taller de Computación en Internet III (NestJS + PostgreSQL). TutorLink es un marketplace de tutorías universitarias: un estudiante busca un tutor por materia, universidad y tarifa, reserva una sesión y, si quiere, deja una reseña cuando la sesión terminó.

**Equipo:** Miguel Pérez, Johan Suarez, Juan Sebastián Rodríguez Legarda
**Entrega del taller:** 13 de octubre de 2026

La API escucha en el puerto **9000** con el prefijo global `tutorlink`. En local, Swagger está en **`http://localhost:9000/docs`**.

La aplicación desplegada está en Render:

- API: `https://compu3-tallernest-tutorlink.onrender.com/tutorlink`
- Swagger: `https://compu3-tallernest-tutorlink.onrender.com/docs`

Si el servicio estuvo un rato sin tráfico, la primera petición puede tardar mientras Render lo despierta. Un usuario nuevo entra siempre como `student`. Los roles son `student`, `tutor` y `admin`.

El informe del taller, con cada endpoint, la autenticación, la autorización, la persistencia y las pruebas, está en [`docs/Informe-TutorLink.docx`](docs/Informe-TutorLink.docx).

## Qué ya está hecho

Persistencia con TypeORM contra PostgreSQL y los módulos de usuarios, materias, tutores, reservas y reseñas. Más seed, Swagger, colección Postman, pruebas unitarias por encima del 80 % de cobertura y el despliegue en Render.

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

### Reseñas (`review`)

Solo se puede reseñar una reserva `COMPLETED` propia. Una reseña por reserva.

| Método | Ruta | Quién |
|---|---|---|
| POST | `/tutorlink/review` | Student dueño. Body: `bookingId`, `rating` (1 a 5), `comment`. |
| GET | `/tutorlink/review/tutor/:tutorId` | Autenticado. Devuelve `average`, `count` y `reviews`. |

Si la reserva no está `COMPLETED`, responde 400. Si no es del estudiante, 403. Si ya tiene reseña, 409. Si no existe, 404.

### Seed

`GET /tutorlink/seed?key=SEED_KEY`. Borra en orden `review`, `booking`, `tutor_profile_subjects`, `tutor_profile`, `subject` y `user`, y carga el admin (de `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_FULL_NAME`), 4 materias, 2 tutores verificados y 2 estudiantes. Sin la clave correcta responde 401. Las contraseñas se hashean con `UserService.encryptPassword`, el mismo método del registro. La respuesta es `{ "message": "SEED EXECUTED", "admin", "subjects", "students", "tutors" }`.

Credenciales de prueba (todas con `Secreta123`, salvo el admin): `tutor1@example.com`, `tutor2@example.com`, `ana@example.com`, `luis@example.com`.

### Swagger

- `main.ts`: `DocumentBuilder().addBearerAuth()` y `SwaggerModule.setup('docs', ...)` (UI en `/docs`).
- `@ApiTags` en cada controller, `@ApiProperty` en DTOs y entidades.
- `@ApiBearerAuth()` vive dentro del decorador `@Auth()`, así las rutas protegidas quedan marcadas solas.

### Postman

Colección en `postman/TutorLink.postman_collection.json`, con variables `baseUrl` (`http://localhost:9000/tutorlink`) y `token` (se guarda solo al registrarse o iniciar sesión). Cubre usuarios, materias, tutores, reservas, reseñas y seed. Para los flujos con otro rol, basta iniciar sesión con ese usuario (el token se sobrescribe).

### Pruebas

Hay pruebas unitarias (Vitest, sin base de datos) de usuarios, materias, tutores, reservas, reseñas y seed, y pruebas de integración (Supertest, con base de datos). Un workflow de GitHub Actions (`.github/workflows/tests.yml`) corre en cada push y en cada pull request a `main`. El job `unit` instala, compila, pasa el linter y corre las unitarias con cobertura. El job `e2e` levanta PostgreSQL 14.3 y corre `npm run test:e2e` con `RUN_E2E=true`. Si ambos pasan en un push a `main`, otro job avisa a Render para que vuelva a desplegar.

`npm run test:cov` exige al menos 80 % de líneas, funciones, branches y statements. La medición actual queda por encima: líneas 90,98 %, statements 90,05 %, funciones 82,69 % y branches 82,58 % (80 pruebas, 15 archivos).

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

Debe responder `SEED EXECUTED`. La misma petición está en la carpeta Seed de Postman. Vuelve a borrar y recargar usuarios, materias, tutores, reservas y reseñas.

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

Importar `postman/TutorLink.postman_collection.json` en Postman. La colección ya trae `baseUrl` (`http://localhost:9000/tutorlink`). Al iniciar sesión, el script guarda el token. El orden sugerido está en la descripción de la colección: Seed, login de admin, materias, tutores, reservas y, con la reserva ya en `COMPLETED`, la reseña del estudiante.

### 7. Probar un flujo a mano

Con el servidor arriba y el seed ejecutado:

```bash
curl "http://localhost:9000/tutorlink/seed?key=una_clave_para_el_seed"
```

Debe responder `SEED EXECUTED`. La misma petición está en la carpeta Seed de Postman.

Probar cada funcionalidad, en orden:

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

# 8. Reseñar (con el token del estudiante dueño de esa reserva)
curl -X POST http://localhost:9000/tutorlink/review \
  -H "Authorization: Bearer <token_estudiante>" -H "Content-Type: application/json" \
  -d '{ "bookingId": "<id_reserva>", "rating": 5, "comment": "Explica muy claro y es puntual." }'
```

Ese mismo flujo está en Swagger y en la colección de Postman (usuarios, materias, tutores, reservas, reseñas y seed).

## Despliegue

La API pública está en Render:

- Aplicación: [https://compu3-tallernest-tutorlink.onrender.com](https://compu3-tallernest-tutorlink.onrender.com)
- API: `https://compu3-tallernest-tutorlink.onrender.com/tutorlink`
- Swagger: [https://compu3-tallernest-tutorlink.onrender.com/docs](https://compu3-tallernest-tutorlink.onrender.com/docs)
- Repositorio: [https://github.com/JRLegarda/Compu3-TallerNest_TutorLink](https://github.com/JRLegarda/Compu3-TallerNest_TutorLink)

El servicio usa el `Dockerfile` del repo (Node 22, `node dist/main.js`). Las variables de base de datos, JWT, admin y `SEED_KEY` están en Render, no en git. Un push a `main` que pase las unitarias y las de integración dispara el deploy hook. Para probar esa instancia con Postman, cambia `baseUrl` a `https://compu3-tallernest-tutorlink.onrender.com/tutorlink`. El seed de producción borra la base de ese entorno.

El detalle de endpoints, autenticación, autorización, persistencia y pruebas está en [`docs/Informe-TutorLink.docx`](docs/Informe-TutorLink.docx). Ese archivo es el que se adjunta en Intu. Este README queda para clonar el proyecto y correrlo.

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
│   │   ├── review.controller.spec.ts
│   │   ├── review.service.ts
│   │   ├── review.service.spec.ts
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
│   └── Informe-TutorLink.docx
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
