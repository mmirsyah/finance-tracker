// tailwind.config.js
import colors from 'tailwindcss/colors';
import tailwindcssAnimate from 'tailwindcss-animate';
import headlessuiTailwindcss from '@headlessui/tailwindcss';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
    // Path to Tremor node module
    './node_modules/@tremor/react/**/*.{js,ts,jsx,tsx}',
  ],

  // PENAMBAHAN BAGIAN SAFELIST DI SINI
  safelist: [
    {
      pattern: /^(bg-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
      variants: ['hover', 'ui-selected'],
    },
    {
      pattern: /^(text-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
      variants: ['hover', 'ui-selected'],
    },
    {
      pattern: /^(border-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
      variants: ['hover', 'ui-selected'],
    },
    {
      pattern: /^(ring-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
    },
    {
      pattern: /^(stroke-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
    },
    {
      pattern: /^(fill-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
    },
	'bg-secondary',
  'text-secondary',
  'border-secondary',
  'fill-secondary',
  'stroke-secondary',
  'ring-secondary',
  'bg-destructive',
  'text-destructive',
  'border-destructive',
  'fill-destructive',
  'stroke-destructive',
  'ring-destructive'
  ],

  prefix: "",
  theme: {
  	container: {
  		center: true,
  		padding: '2rem',
  		screens: {
  			'2xl': '1400px'
  		}
  	},
  	extend: {
  		colors: {
  			border: 'oklch(var(--border))',
  			input: 'oklch(var(--input))',
  			ring: 'oklch(var(--ring))',

			background: {
			dark: 'oklch(var(--background-dark))',
  			DEFAULT: 'oklch(var(--background))'
			},

			foreground: 'oklch(var(--foreground))',

  			primary: {
  				DEFAULT: 'oklch(var(--primary)/<alpha-value>)',
  				foreground: 'oklch(var(--primary-foreground))'
  			},

  			secondary: {
  				DEFAULT: 'oklch(var(--secondary)/<alpha-value>)',
  				foreground: 'oklch(var(--secondary-foreground))',
  				text: 'oklch(var(--secondary-text))'
  			},

			warning: {
				DEFAULT: 'oklch(var(--warning)/<alpha-value>)',
  				foreground: 'oklch(var(--warning-foreground))'
			},

  			destructive: {
  				DEFAULT: 'oklch(var(--destructive)/<alpha-value>)',
  				foreground: 'oklch(var(--destructive-foreground))',
  				text: 'oklch(var(--destructive-text))'
  			},

  			muted: {
  				DEFAULT: 'oklch(var(--muted))',
  				foreground: 'oklch(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'oklch(var(--accent))',
  				foreground: 'oklch(var(--accent-foreground))'
  			},
  			popover: {
  				DEFAULT: 'oklch(var(--popover))',
  				foreground: 'oklch(var(--popover-foreground))'
  			},
  			card: {
  				DEFAULT: 'oklch(var(--card)/<alpha-value>)',
  				foreground: 'oklch(var(--card-foreground))'
  			},
  			tremor: {
  				brand: {
  					faint: '#eff6ff',
  					muted: '#bfdbfe',
  					subtle: '#60a5fa',
  					DEFAULT: '#3b82f6',
  					emphasis: '#1d4ed8',
  					inverted: '#ffffff'
  				},
  				background: {
  					muted: '#f9fafb',
  					subtle: '#f3f4f6',
  					DEFAULT: '#ffffff',
  					emphasis: '#374151'
  				},
  				border: {
  					DEFAULT: '#e5e7eb'
  				},
  				ring: {
  					DEFAULT: '#e5e7eb'
  				},
  				content: {
  					subtle: '#9ca3af',
  					DEFAULT: '#6b7280',
  					emphasis: '#374151',
  					strong: '#111827',
  					inverted: '#ffffff'
  				}
  			}
  		},
  		boxShadow: {
  			'tremor-input': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  			'tremor-card': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  			'tremor-dropdown': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)',
  			'tremor-small': '0.375rem',
  			'tremor-default': '0.5rem',
  			'tremor-full': '9999px'
  		},
  		fontSize: {
  			'tremor-label': ['0.75rem', { lineHeight: '1rem' }],
  			'tremor-default': ['0.875rem', { lineHeight: '1.25rem' }],
  			'tremor-title': ['1.125rem', { lineHeight: '1.75rem' }],
  			'tremor-metric': ['1.875rem', { lineHeight: '2.25rem' }]
  		},
  		keyframes: {
  			'accordion-down': {
  				from: { height: '0' },
  				to: { height: 'var(--radix-accordion-content-height)' }
  			},
  			'accordion-up': {
  				from: { height: 'var(--radix-accordion-content-height)' },
  				to: { height: '0' }
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		}
  	}
  },
  plugins: [
    tailwindcssAnimate,
    headlessuiTailwindcss
  ],
}