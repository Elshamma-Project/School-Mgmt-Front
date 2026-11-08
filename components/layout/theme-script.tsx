import Script from "next/script";
import { THEME_STORAGE_KEY } from "@/lib/theme/constants";

const THEME_BOOTSTRAP = `(function(){try{var raw=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(!raw)return;var parsed=JSON.parse(raw);var theme=parsed&&parsed.state&&parsed.state.theme;if(theme==="dark"){document.documentElement.classList.add("dark");document.documentElement.style.colorScheme="dark";}else{document.documentElement.classList.remove("dark");document.documentElement.style.colorScheme="light";}}catch(e){}})();`;

/** Anti-FOUC : applique le thème persisté avant l’hydratation (next/script). */
export function ThemeScript() {
  return (
    <Script id="smels-theme-bootstrap" strategy="beforeInteractive">
      {THEME_BOOTSTRAP}
    </Script>
  );
}
