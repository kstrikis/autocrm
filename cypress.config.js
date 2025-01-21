import { defineConfig } from 'cypress'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import path from 'path'
import webpackPreprocessor from '@cypress/webpack-preprocessor'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default defineConfig({
  component: {
    devServer: {
      framework: 'react',
      bundler: 'vite',
    },
    specPattern: 'cypress/component/**/*.cy.{js,jsx}',
    supportFile: 'cypress/support/component.js',
    indexHtmlFile: 'cypress/support/component-index.html'
  },
  e2e: {
    baseUrl: 'http://localhost:5173',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx}',
    supportFile: 'cypress/support/e2e.js',
    setupNodeEvents(on, config) {
      const options = {
        webpackOptions: {
          resolve: {
            alias: {
              '@': path.resolve(__dirname, './src'),
            },
            extensions: ['.js', '.jsx', '.ts', '.tsx'],
          },
          module: {
            rules: [
              {
                test: /\.[jt]sx?$/,
                exclude: [/node_modules/],
                use: {
                  loader: 'babel-loader',
                  options: {
                    presets: ['@babel/preset-env', '@babel/preset-react', '@babel/preset-typescript'],
                  },
                },
              },
            ],
          },
        },
      }
      on('file:preprocessor', webpackPreprocessor(options))
      return config
    },
    video: false,
    screenshotOnRunFailure: true,
    viewportWidth: 1280,
    viewportHeight: 720,
    experimentalWebKitSupport: true,
    defaultCommandTimeout: 2000,
    pageLoadTimeout: 5000,
    requestTimeout: 2000,
    responseTimeout: 5000,
    watchForFileChanges: false,
    chromeWebSecurity: false,
    env: {
      // Default values, can be overridden by cypress.env.json
      SUPABASE_URL: process.env.VITE_SUPABASE_URL,
      SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY
    }
  }
}) 