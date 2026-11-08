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
            'navy': '#050505',
            'navy-2': '#14100a',
            'gold': '#b8864b',
            'gold-light': '#e0c49c',
            'muted': '#b9bdd1',
        }
  } 
},
  plugins: [],
}