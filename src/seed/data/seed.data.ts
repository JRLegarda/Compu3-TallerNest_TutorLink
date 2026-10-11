export const seedSubjects = [
  { name: 'Cálculo I', university: 'ICESI', semester: '3' },
  { name: 'Programación I', university: 'ICESI', semester: '2' },
  { name: 'Física I', university: 'ICESI', semester: '2' },
  { name: 'Álgebra Lineal', university: 'ICESI', semester: '1' },
];

export const seedStudents = [
  { email: 'ana@example.com', password: 'Secreta123', fullName: 'Ana Pérez' },
  { email: 'luis@example.com', password: 'Secreta123', fullName: 'Luis Gómez' },
];

export const seedTutors = [
  {
    email: 'tutor1@example.com',
    password: 'Secreta123',
    fullName: 'Carlos Tutor',
    bio: 'Estudiante de ingeniería con 3 semestres dando tutorías de cálculo y álgebra.',
    hourlyRate: 15000,
    academicHistory: 'Monitor de Cálculo I (2025), promedio 4.5.',
    university: 'ICESI',
    subjectNames: ['Cálculo I', 'Álgebra Lineal'],
  },
  {
    email: 'tutor2@example.com',
    password: 'Secreta123',
    fullName: 'María Tutora',
    bio: 'Estudiante de sistemas con experiencia en programación y física desde 2024.',
    hourlyRate: 18000,
    academicHistory: 'Monitora de Programación I (2025), promedio 4.7.',
    university: 'ICESI',
    subjectNames: ['Programación I', 'Física I'],
  },
];
