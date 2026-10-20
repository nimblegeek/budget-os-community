export const themeKey='budget-os-theme';
export const resolveTheme=(value:unknown):'dark'|'light'=>value==='light'?'light':'dark';
// Runs before the body paints. No data or credentials are stored with the theme.
export const themeBootstrap=`(()=>{try{document.documentElement.dataset.theme=localStorage.getItem('${themeKey}')==='light'?'light':'dark'}catch{}})();`;
