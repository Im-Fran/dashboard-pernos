// vite.config.ts
import { resolve } from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // OJO: rolldownOptions en Vite 6+
    rolldownOptions: {
      output: {
        advancedChunks: {
          groups: [
            // 1) Core de Recharts (ejes, utils, componentes comunes)
            {
              name: 'rechart-core',
              test: /node_modules[\\/]recharts[\\/](lib|es|src)?[\\/](component|util|shape|container|context|cartesian[\\/]Cartesian|polar[\\/]Polar)/,
              priority: 50, // alta prioridad para capturar dependencias comunes primero
            },

            // 2) Chunks por tipo de gráfico de Recharts (name dinámico)
            {
              // Un solo grupo que devuelve N nombres => N chunks
              name: (id: string) => {
                if (!/node_modules[\\/]recharts/.test(id)) return null

                // line
                if (/(LineChart|[\\/]cartesian[\\/]Line(\.|[\\/]))/.test(id)) return 'rechart-line'

                // bar
                if (/(BarChart|[\\/]cartesian[\\/]Bar(\.|[\\/]))/.test(id)) return 'rechart-bars'

                // area
                if (/(AreaChart|[\\/]cartesian[\\/]Area(\.|[\\/]))/.test(id)) return 'rechart-area'

                // pie / donut
                if (/(PieChart|[\\/]polar[\\/]Pie(\.|[\\/]))/.test(id)) return 'rechart-pie'

                // radar
                if (/(RadarChart|[\\/]polar[\\/]Radar(\.|[\\/]))/.test(id)) return 'rechart-radar'

                // radial bar
                if (/(RadialBarChart|[\\/]polar[\\/]RadialBar(\.|[\\/]))/.test(id)) return 'rechart-radialbar'

                // scatter
                if (/(ScatterChart|[\\/]cartesian[\\/]Scatter(\.|[\\/]))/.test(id)) return 'rechart-scatter'

                // treemap
                if (/([\\/]Treemap(\.|[\\/]))/.test(id)) return 'rechart-treemap'

                // fallback: mete cualquier otro módulo de recharts aquí
                return 'rechart-misc'
              },
              // restringe a recharts para que no toque otros paquetes
              test: /node_modules[\\/]recharts[\\/]/,
              priority: 40,
            },

            // 3) Firebase Core (app, utils, dependencias comunes)
            {
              name: 'firebase-core',
              test: /node_modules[\\/]firebase[\\/](app|util|logger|component|webchannel-wrapper)/,
              priority: 50, // alta prioridad para capturar dependencias comunes primero
            },

            // 4) Chunks por servicio de Firebase (name dinámico)
            {
              name: (id: string) => {
                if (!/node_modules[\\/]firebase[\\/]/.test(id)) return null

                // auth
                if (/([\\/]auth[\\/])/.test(id)) return 'firebase-auth'

                // firestore
                if (/([\\/]firestore[\\/])/.test(id)) return 'firebase-firestore'

                // storage
                if (/([\\/]storage[\\/])/.test(id)) return 'firebase-storage'

                // database (realtime)
                if (/([\\/]database[\\/])/.test(id)) return 'firebase-database'

                // functions
                if (/([\\/]functions[\\/])/.test(id)) return 'firebase-functions'

                // messaging
                if (/([\\/]messaging[\\/])/.test(id)) return 'firebase-messaging'

                // analytics
                if (/([\\/]analytics[\\/])/.test(id)) return 'firebase-analytics'

                // performance
                if (/([\\/]performance[\\/])/.test(id)) return 'firebase-performance'

                // remote-config
                if (/([\\/]remote-config[\\/])/.test(id)) return 'firebase-remote-config'

                // installations
                if (/([\\/]installations[\\/])/.test(id)) return 'firebase-installations'

                // fallback: mete cualquier otro módulo de firebase aquí
                return 'firebase-misc'
              },
              // restringe a firebase para que no toque otros paquetes
              test: /node_modules[\\/]firebase[\\/]/,
              priority: 40,
            },

            // 5) Radix UI Core (primitives comunes, utils, shared)
            {
              name: 'radix-core',
              test: /node_modules[\\/]@radix-ui[\\/](react-primitive|react-compose-refs|react-context|react-use-|react-id|react-portal|react-presence|react-dismissable-layer|react-focus-|react-slot)/,
              priority: 50, // alta prioridad para capturar dependencias comunes primero
            },

            // 6) Chunks por componente de Radix UI (name dinámico)
            {
              name: (id: string) => {
                if (!/node_modules[\\/]@radix-ui[\\/]/.test(id)) return null

                // dialog (usado por sheet)
                if (/(react-dialog)/.test(id)) return 'radix-dialog'

                // dropdown-menu
                if (/(react-dropdown-menu)/.test(id)) return 'radix-dropdown-menu'

                // select
                if (/(react-select)/.test(id)) return 'radix-select'

                // tooltip
                if (/(react-tooltip)/.test(id)) return 'radix-tooltip'

                // popover
                if (/(react-popover)/.test(id)) return 'radix-popover'

                // separator
                if (/(react-separator)/.test(id)) return 'radix-separator'

                // accordion
                if (/(react-accordion)/.test(id)) return 'radix-accordion'

                // alert-dialog
                if (/(react-alert-dialog)/.test(id)) return 'radix-alert-dialog'

                // checkbox
                if (/(react-checkbox)/.test(id)) return 'radix-checkbox'

                // collapsible
                if (/(react-collapsible)/.test(id)) return 'radix-collapsible'

                // hover-card
                if (/(react-hover-card)/.test(id)) return 'radix-hover-card'

                // label
                if (/(react-label)/.test(id)) return 'radix-label'

                // menubar
                if (/(react-menubar)/.test(id)) return 'radix-menubar'

                // navigation-menu
                if (/(react-navigation-menu)/.test(id)) return 'radix-navigation-menu'

                // progress
                if (/(react-progress)/.test(id)) return 'radix-progress'

                // radio-group
                if (/(react-radio-group)/.test(id)) return 'radix-radio-group'

                // scroll-area
                if (/(react-scroll-area)/.test(id)) return 'radix-scroll-area'

                // slider
                if (/(react-slider)/.test(id)) return 'radix-slider'

                // switch
                if (/(react-switch)/.test(id)) return 'radix-switch'

                // tabs
                if (/(react-tabs)/.test(id)) return 'radix-tabs'

                // toggle
                if (/(react-toggle)/.test(id)) return 'radix-toggle'

                // toggle-group
                if (/(react-toggle-group)/.test(id)) return 'radix-toggle-group'

                // toolbar
                if (/(react-toolbar)/.test(id)) return 'radix-toolbar'

                // fallback: mete cualquier otro módulo de radix-ui aquí
                return 'radix-misc'
              },
              // restringe a radix-ui para que no toque otros paquetes
              test: /node_modules[\\/]@radix-ui[\\/]/,
              priority: 40,
            },

            // 7) Otros vendors grandes (React y chart.js si también usas)
            {
              test: /node_modules[\\/]react(-dom)?[\\/]/,
              name: 'react-vendors',
              priority: 30,
            },
            {
              test: /node_modules[\\/]chart\.js[\\/]/,
              name: 'chartjs-vendor',
              priority: 30,
            },

            // 8) resto de node_modules
            {
              test: /node_modules[\\/]/,
              name: 'libs',
              priority: 10,
            },

            // 9) tu código
            { test: /src[\\/]components[\\/]/, name: 'components' },
            { test: /src[\\/]utils[\\/]/,      name: 'utils' },
          ],
        },
      },
    },
  },
  resolve: {
    alias: [{ find: '@', replacement: resolve(__dirname, 'src') }],
  },
})