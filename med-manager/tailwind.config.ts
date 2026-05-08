import type { Config } from 'tailwindcss'

/** Tailwind：与 PRD 设计 token 配合，间距对齐 16px 安全边距 */
const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      maxWidth: {
        app: '640px',
      },
      minHeight: {
        touch: '44px',
      },
      borderRadius: {
        card: '12px',
      },
      fontSize: {
        body: ['17px', { lineHeight: '1.55' }],
        'card-title': ['18px', { lineHeight: '1.4', fontWeight: '600' }],
        hero: ['22px', { lineHeight: '1.35', fontWeight: '600' }],
        caption: ['15px', { lineHeight: '1.5' }],
        stat: ['21px', { lineHeight: '1.3', fontWeight: '600' }],
      },
    },
  },
  plugins: [],
}

export default config
