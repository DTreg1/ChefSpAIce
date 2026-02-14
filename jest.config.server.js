module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/server/__tests__/integration/**/*.test.ts'],
  moduleNameMapper: {
    '^@shared/(.*)$': '<rootDir>/shared/$1',
    '^@/(.*)$': '<rootDir>/client/$1',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      diagnostics: false,
      tsconfig: {
        module: 'commonjs',
        moduleResolution: 'node',
        esModuleInterop: true,
        strict: false,
        noUnusedLocals: false,
        noUnusedParameters: false,
        paths: {
          '@shared/*': ['./shared/*'],
          '@/*': ['./client/*'],
        },
      },
    }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(stripe-replit-sync)/)',
  ],
  modulePathIgnorePatterns: [
    '<rootDir>/.cache/',
    '<rootDir>/node_modules/.cache/',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testTimeout: 30000,
  forceExit: true,
  coverageDirectory: 'coverage/server',
  collectCoverageFrom: [
    'server/**/*.ts',
    '!server/**/*.d.ts',
    '!server/**/*.test.ts',
    '!server/__tests__/**',
    '!server/vite.ts',
    '!server/scripts/**',
    '!server/seeds/**',
  ],
  coverageThreshold: {
    global: {
      statements: 60,
      branches: 50,
      functions: 60,
      lines: 60,
    },
  },
};
