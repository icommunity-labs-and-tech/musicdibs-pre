import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
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
        'magenta': 'hsl(320 75% 56% / <alpha-value>)',
				'magenta-glow': 'hsl(325 80% 67% / <alpha-value>)',
				'deep': 'hsl(285 25% 7% / <alpha-value>)',
								page: {
					DEFAULT: 'hsl(var(--page-text))',
					muted: 'hsl(var(--page-text-muted))',
					fg: 'hsl(var(--page-fg) / <alpha-value>)',
					'fg-muted': 'hsl(var(--page-fg-muted))',
					'fg-subtle': 'hsl(var(--page-fg-subtle))',
					surface: 'hsl(var(--page-surface))',
					'surface-strong': 'hsl(var(--page-surface-strong))',
					border: 'hsl(var(--page-border))',
					'border-strong': 'hsl(var(--page-border-strong))',
					scrim: 'hsl(var(--page-scrim))'
				},
				compare: {
					panel: 'hsl(var(--compare-panel))',
					row: 'hsl(var(--compare-row))',
					highlight: 'hsl(var(--compare-highlight))',
					border: 'hsl(var(--compare-border))',
					accent: 'hsl(var(--compare-accent))',
					badge: 'hsl(var(--compare-badge))',
					success: 'hsl(var(--compare-success))',
					danger: 'hsl(var(--compare-danger))',
					warning: 'hsl(var(--compare-warning))'
				},
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary) / <alpha-value>)',
					foreground: 'hsl(var(--primary-foreground) / <alpha-value>)'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary) / <alpha-value>)',
					foreground: 'hsl(var(--secondary-foreground) / <alpha-value>)'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive) / <alpha-value>)',
					foreground: 'hsl(var(--destructive-foreground) / <alpha-value>)'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted) / <alpha-value>)',
					foreground: 'hsl(var(--muted-foreground) / <alpha-value>)'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent) / <alpha-value>)',
					foreground: 'hsl(var(--accent-foreground) / <alpha-value>)'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				brand: {
					DEFAULT: 'hsl(var(--brand) / <alpha-value>)',
					foreground: 'hsl(var(--brand-foreground) / <alpha-value>)',
					glow: 'hsl(var(--brand-glow) / <alpha-value>)'
				},
				success: {
					DEFAULT: 'hsl(var(--success) / <alpha-value>)',
					foreground: 'hsl(var(--success-foreground) / <alpha-value>)'
				},
				warning: {
					DEFAULT: 'hsl(var(--warning) / <alpha-value>)',
					foreground: 'hsl(var(--warning-foreground) / <alpha-value>)'
				},
				info: {
					DEFAULT: 'hsl(var(--info) / <alpha-value>)',
					foreground: 'hsl(var(--info-foreground) / <alpha-value>)'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out'
			},
			boxShadow: {
				'compare-table': 'var(--compare-table-shadow)'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
