import { createHash } from 'node:crypto';

export const consoleCss = `
:root{color-scheme:light;--wt-ink:#10223e;--wt-muted:#455973;--wt-line:#c7d4e3;--wt-canvas:#edf3f9;--wt-paper:#fff;--wt-blue:#105b80;--wt-teal:#11685f}
*{box-sizing:border-box}body{margin:0;background:radial-gradient(ellipse at top left,#f8fbff 5%,transparent 63%),var(--wt-canvas);color:var(--wt-ink);font:1rem/1.55 system-ui,sans-serif}
a{color:#145489;text-underline-offset:.19em}a:focus-visible,[tabindex="0"]:focus-visible,button:focus-visible,summary:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible{outline:3px solid #0d8177;outline-offset:3px}
h1,h2,h3{overflow-wrap:anywhere;letter-spacing:-.028em;line-height:1.17}h1{font-size:clamp(2rem,5vw,3.5rem);margin:.4rem 0 .85rem}h2{font-size:1.32rem}
code,dd{overflow-wrap:anywhere}pre{max-width:100%;overflow:auto}label{display:block;margin:.75rem 0 .35rem;font-weight:650}
input:not([type=hidden],[type=checkbox],[type=radio]),select,textarea{box-sizing:border-box;width:100%;max-width:43rem;border:1px solid #8195b0;border-radius:.55rem;padding:.65rem .75rem;background:#fff;color:#10223e;font:inherit}
button,.wt-action{display:inline-flex;align-items:center;justify-content:center;min-height:2.75rem;border:1px solid transparent;border-radius:.55rem;padding:.58rem .95rem;font:inherit;font-weight:700;color:white;background:#152d4b;cursor:pointer;text-decoration:none}
.card form button,.wt-main form button{margin-top:.6rem}code{background:#eaf1f8;color:#10223e;border-radius:.26rem;padding:.06em .26em}
.wt-secondary{color:var(--wt-ink);background:#fff;border-color:var(--wt-line)}
button:hover,.wt-action:hover{filter:brightness(1.19)}button:disabled{opacity:.68;cursor:default}
.wt-header{background:#132642;color:white;border-bottom:3px solid #4fcbba}
.wt-nav{max-width:78rem;margin:auto;padding:.8rem clamp(1rem,4vw,2.5rem);display:flex;align-items:center;gap:.55rem 1rem;flex-wrap:wrap}
.wt-nav a{color:#e5edf9;text-decoration:none;padding:.34rem .08rem;font-size:.94rem}.wt-nav a:hover{text-decoration:underline}.wt-nav a:focus-visible{outline-color:#7de7d6}.wt-brand{font-weight:790;margin-right:auto;font-size:1.12rem!important}
.wt-main{max-width:78rem;margin:auto;padding:clamp(1.1rem,4vw,3rem) clamp(1rem,4vw,2.5rem) 3.5rem}
.wt-copy{max-width:68ch;color:var(--wt-muted);margin:0 0 1.4rem;font-size:1.06rem}
.wt-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,18rem),1fr));gap:1rem}
.wt-card,.card,.wt-notice{min-width:0;padding:clamp(1rem,2.5vw,1.5rem);background:var(--wt-paper);border:1px solid var(--wt-line);border-radius:1rem}
.wt-card h2,.card h2{margin:.75rem 0}.wt-card p,.wt-notice p{color:var(--wt-muted)}.wt-card{display:flex;flex-direction:column}.wt-card .wt-action{margin-top:auto}
.wt-step{display:inline-grid;place-items:center;width:2.6rem;height:2.6rem;border-radius:50%;background:#152d4b;color:white;font-weight:760}.wt-grt .wt-step,.wt-grt .wt-action{background:var(--wt-blue)}.wt-pilot .wt-step,.wt-pilot .wt-action{background:var(--wt-teal)}
.wt-flow{margin:1.4rem 0;padding:0;list-style:none}.wt-main>article,.wt-main>.card{margin-bottom:1rem}
.wt-meta{border-top:1px solid var(--wt-line);padding-top:.65rem;margin-top:.3rem}.wt-notice{margin:1.25rem 0;background:#e4eff8}.wt-links{display:flex;gap:.55rem 1.4rem;flex-wrap:wrap;margin:1.25rem 0}
.wt-table{overflow:auto;max-width:100%;border-radius:.5rem}table{border-collapse:collapse;width:100%;text-align:left}th,td{padding:.65rem;border-bottom:1px solid var(--wt-line);overflow-wrap:anywhere}.wt-main>section,.wt-login form{margin-bottom:1rem}
.wt-login{color:#f3f7fd;background:#132642;max-width:35rem;margin:clamp(2rem,9vh,6rem) auto;padding:clamp(1.25rem,5vw,2.6rem);border-radius:1.2rem;box-shadow:0 24px 60px #112b4a24}
.wt-login,.wt-consent{width:calc(100% - 2rem)}.wt-consent{margin:clamp(1rem,7vh,4.5rem) auto;max-width:38rem}.wt-consent .wt-links button{flex:1}.wt-consent button[value=deny]{background:white;color:var(--wt-ink);border-color:#8195b0}.ok{color:#11685f;font-weight:700}.ko{color:#a12032;font-weight:700}.warning{background:#fff4e8}
.wt-login a{color:#8ce9db}.wt-login h1{font-size:clamp(1.7rem,5vw,2.45rem)}.wt-login button{background:#7bdfd0;color:#09263a;width:100%;margin-top:1rem}.wt-login p{color:#dee8f6}.wt-login .wt-error{color:#ffb5bd}.wt-login :focus-visible{outline-color:#9bf6e6}
@media(max-width:44rem){.wt-brand{width:100%;margin:0}.wt-main{padding-top:1.2rem}.wt-nav{gap:.3rem .8rem}.wt-nav a:not(.wt-brand){font-size:.86rem}}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{scroll-behavior:auto!important;transition:none!important;animation:none!important}}
`;

export const consoleStyleTag = `<style>${consoleCss}</style>`;
export const consoleStyleHash = "'sha256-" + createHash('sha256').update(consoleCss).digest('base64') + "'";
export const viewportTag = '<meta name="viewport" content="width=device-width, initial-scale=1">';

export function consoleNav() {
  return `<header class="wt-header"><nav class="wt-nav" aria-label="Navigation principale">
    <a class="wt-brand" href="/dashboard">WealthTech MCP</a>
    <a href="/admissions">Admissions</a><a href="/git">Registre Git</a><a href="/github">GitHub</a>
    <a href="/provisioning/project-runtime">Provisionnement</a><a href="/guide/cug-grt">Guide</a><a href="/logout">Déconnexion</a>
  </nav></header>`;
}

/** Body and title must be rendered by a trusted template; dynamic values are escaped by the caller. */
export function consoleDocument(safeTitle: string, trustedBody: string) {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8">${viewportTag}<title>${safeTitle}</title>${consoleStyleTag}</head><body>${consoleNav()}<main class="wt-main">${trustedBody}</main></body></html>`;
}
