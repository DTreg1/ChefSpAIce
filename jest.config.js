module.exports = {
  preset: 'jest-expo',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/client/$1',
    '^@shared/(.*)$': '<rootDir>/shared/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|date-fns)',
  ],
  modulePathIgnorePatterns: [
    '<rootDir>/.cache/',
    '<rootDir>/node_modules/.cache/',
  ],
  haste: {
    defaultPlatform: 'ios',
    platforms: ['android', 'ios', 'native'],
  },
  watchPathIgnorePatterns: [
    '<rootDir>/.cache/',
  ],
  setupFilesAfterEnv: [],
  collectCoverageFrom: [
    'client/**/*.{ts,tsx}',
    '!client/**/*.d.ts',
    '!client/**/index.ts',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
};
