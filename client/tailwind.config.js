/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx,js,jsx}",
    "./node_modules/flowbite/**/*.js"
  ],
  theme: {
    extend: {
      fontFamily: {
        'sans': [
          'Noto Sans KR'
        ],
      }
    }
  },
  corePlugins: {
    preflight: false, // ✅ TOAST UI Editor 스타일 충돌 방지
  },
  plugins: [
    require('flowbite/plugin')
  ]
};