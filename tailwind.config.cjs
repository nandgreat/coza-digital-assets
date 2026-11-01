/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./resources/**/*.blade.php",
    "./resources/**/*.js",
    "./resources/**/*.jsx",
    "./resources/js/**/*.{js,jsx}",
    "./resources/js/Pages/**/*.{js,jsx}",
  //  "./resources/js/Pages/Admin/**/*.{js,jsx}",   /** Unconmment to include the Admin pages */
    "./resources/js/Pages/Analytics/**/*.{js,jsx}",
  ],
  theme: { 
    extend: {
        colors: {
            'navy': '#0b0f1f',
            'navy-2': '#141a33',
            'gold': '#d4af37',
            'gold-light': '#f1d97a',
            'muted': '#b9bdd1',
        }
  } 
},
  plugins: [],
}