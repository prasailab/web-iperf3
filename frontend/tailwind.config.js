/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: '#EBE3CE',  // Light beige/off-white from logo
                secondary: '#4A1D2F', // Dark burgundy/maroon from logo
                accent: '#D4AF37',   // Gold/yellow matching logo vibe (if any) or generic gold
            },
        },
    },
    plugins: [],
}
