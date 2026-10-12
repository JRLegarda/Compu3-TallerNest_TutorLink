import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // User+Subject y Tutor+Booking comparten la base y ambos ejecutan el seed.
    fileParallelism: false,
    // El arranque de Nest contra Postgres en CI puede pasar de los 10s por defecto.
    hookTimeout: 30000,
    testTimeout: 20000,
  },
});
