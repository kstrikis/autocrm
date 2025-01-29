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
    experimentalRunAllSpecs: true,
    setupNodeEvents(on, config) {
      // Add task for logging
      on('task', {
        log(message) {
          // Format the message nicely
          const { message: msg, ...data } = message
          
          // Get timestamp
          const timestamp = (new Date().getSeconds() + (new Date().getMilliseconds() / 1000)).toFixed(3);
          
          // Print the message with emoji for better visibility
          console.log(`[${timestamp}] 🔍 ${msg}`)
          
          // If there's additional data, format it nicely
          if (Object.keys(data).length > 0) {
            Object.entries(data).forEach(([key, value]) => {
              // Handle different types of values
              if (value instanceof Error) {
                console.log(`  ❌ ${key}:`)
                console.log(`    ${value.message}`)
                if (value.stack) {
                  console.log(`    ${value.stack.split('\n').slice(1).join('\n    ')}`)
                }
              } else if (typeof value === 'object') {
                console.log(`  📋 ${key}:`)
                console.dir(value, { depth: null, colors: true, maxArrayLength: null })
              } else {
                console.log(`  ℹ️  ${key}: ${value}`)
              }
            })
          }
          
          return null
        }
      })

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