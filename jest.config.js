/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.(ts|tsx)?$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx'
      }
    }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^lodash-es$': 'lodash'
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@supabase|node-fetch|lodash-es)/)',
  ],
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.cjs'
  ],
  testEnvironmentOptions: {
    customExportConditions: [''],
  }
};
