import { fileURLToPath } from 'url'
import reactPlugin from 'eslint-plugin-react'
import importPlugin from 'eslint-plugin-import'
import cypressPlugin from 'eslint-plugin-cypress'
import enforceLogging from './eslint-rules/enforce-logging.js'

export default [
  {
    files: ['amplify/**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: (await import('@typescript-eslint/parser')).default,
      parserOptions: {
        ecmaFeatures: { jsx: true }
      }
    },
    plugins: {
      '@typescript-eslint': (await import('@typescript-eslint/eslint-plugin')).default,
    },
    rules: {
      'no-console': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'default',
          format: null
        },
        {
          selector: 'variable',
          format: null
        },
        {
          selector: 'property',
          format: null
        }
      ],
      'enforce-logging/enforce-logging': 'off'
    }
  },
  {
    files: ['cypress/**/*.{ts,tsx}', '**/*.cy.{ts,tsx}', 'cypress.config.ts'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: (await import('@typescript-eslint/parser')).default,
      parserOptions: {
        project: ['./cypress/tsconfig.json'],
        ecmaFeatures: { jsx: true }
      },
      globals: {
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        before: 'readonly',
        after: 'readonly',
        cy: 'readonly',
        Cypress: 'readonly',
        context: 'readonly',
        specify: 'readonly',
        assert: 'readonly'
      }
    },
    plugins: {
      '@typescript-eslint': (await import('@typescript-eslint/eslint-plugin')).default,
      cypress: cypressPlugin
    },
    settings: {
      'import/resolver': {
        typescript: {}
      }
    },
    rules: {
      'enforce-logging/enforce-logging': 'off',
      'no-console': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      'cypress/no-assigning-return-values': 'error',
      'cypress/no-unnecessary-waiting': 'error',
      'cypress/assertion-before-screenshot': 'warn',
      'cypress/no-force': 'warn',
      'cypress/no-async-tests': 'error'
    }
  },
  {
    files: ['**/*.{ts,tsx}'],
    ignores: [
      'dist/**/*',
      'build/**/*',
      'node_modules/**/*',
      'src/lib/logger.ts',
      '**/test-*.ts',
      '**/scripts/**/*',
      '**/*.{spec,test}.{ts,tsx}',
      '**/tests/**/*',
      '**/e2e/**/*',
      'cypress/**/*',
      '**/*.cy.{ts,tsx}',
      'cypress.config.ts',
      'src/components/ui/**',
      'amplify/**/*'
    ],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: (await import('@typescript-eslint/parser')).default,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        projectService: true,
        tsconfigRootDir: fileURLToPath(new URL('.', import.meta.url)),
        project: ['./tsconfig.json']
      }
    },
    plugins: {
      '@typescript-eslint': (await import('@typescript-eslint/eslint-plugin')).default,
      'enforce-logging': { rules: { 'enforce-logging': enforceLogging } },
      'react': reactPlugin,
      'import': importPlugin
    },
    settings: {
      react: { version: 'detect' },
      'import/resolver': { typescript: {} }
    },
    rules: {
      'no-console': 'error',
      '@typescript-eslint/explicit-function-return-type': 'error',
      '@typescript-eslint/no-floating-promises': ['error', { ignoreVoid: true, ignoreIIFE: true }],
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'default',
          format: ['camelCase', 'PascalCase'],
          leadingUnderscore: 'allow'
        },
        {
          selector: 'variable',
          format: ['camelCase', 'PascalCase', 'UPPER_CASE'],
          leadingUnderscore: 'allow'
        },
        {
          selector: 'typeLike',
          format: ['PascalCase']
        },
        {
          selector: 'enumMember',
          format: ['UPPER_CASE']
        },
        {
          selector: 'property',
          format: ['camelCase', 'snake_case', 'UPPER_CASE'],
          filter: {
            regex: '^(VITE_|[a-z]+_[a-z_]+|ADD_TOAST|UPDATE_TOAST|DISMISS_TOAST|REMOVE_TOAST).*$',
            match: true
          }
        }
      ],
      'enforce-logging/enforce-logging': ['error', {
        excludeSmallFunctions: true,
        smallFunctionThreshold: 3,
        excludePatterns: [
          '^(get|set)[A-Z].*$',
          '^handle(Change|Click|Submit|Delete)$',
          '^on[A-Z].*$',
          '^render[A-Z].*$',
          '^use[A-Z].*$',
          '^map[A-Z].*$',
          '^filter[A-Z].*$',
          '^reduce[A-Z].*$',
          '^format[A-Z].*$',
          '^transform[A-Z].*$',
          '^validate[A-Z].*$',
          '^compute[A-Z].*$',
          '^parse[A-Z].*$',
          '^serialize[A-Z].*$',
          '^normalize[A-Z].*$',
          '^denormalize[A-Z].*$',
          '^to[A-Z].*$',
          '^from[A-Z].*$',
          '^is[A-Z].*$',
          '^has[A-Z].*$',
          '^should[A-Z].*$',
          '^can[A-Z].*$',
          '^will[A-Z].*$',
          '^did[A-Z].*$',
          '^component.*$',
          '^anonymous$'
        ]
      }]
    }
  },
  {
    files: ['src/hooks/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/naming-convention': 'off',
      'enforce-logging/enforce-logging': 'off'
    }
  },
  {
    files: ['src/lib/contexts/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off'
    }
  },
  {
    files: ['**/*.{spec,test}.{ts,tsx}', '**/test-*.ts', '**/scripts/**/*.ts'],
    rules: {
      'enforce-logging/enforce-logging': 'off',
      'no-console': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off'
    }
  }
] 