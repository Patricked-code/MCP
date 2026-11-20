import { randomBytes } from 'node:crypto';
import { Router } from 'express';

export const cugJourneyGuidePath = '/guide/cug-grt';

export function createCugJourneyGuideRouter() {
  const router = Router();
  router.get('/guide/cug-grt', (_req, res) => {
    const nonce = randomBytes(18).toString('base64');
    res.set({
      'Content-Security-Policy': `default-src 'none'; style-src 'nonce-${nonce}'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`,
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff'
    });
    res.type('html').send(`<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Guide CUG / GRT · WealthTech MCP</title>
<style nonce="${nonce}">
:root{color-scheme:dark;--ink:#f1f6ff;--muted:#bac8e0;--line:#3b5275;--accent:#8be8dc;--surface:#10213d}
*{box-sizing:border-box}body{margin:0;color:var(--ink);background:radial-gradient(ellipse at 4% 0%,#233451,transparent 55%),#091426;font:1rem/1.6 system-ui,sans-serif}
main{max-width:65rem;margin:auto;padding:clamp(1.25rem,5vw,4.5rem)}h1,h2,h3{line-height:1.18;letter-spacing:-.025em}h1{font-size:clamp(2rem,6vw,4rem);max-width:18ch;margin:.5rem 0}h2{font-size:1.55rem;margin:2rem 0 1rem}
p{color:var(--muted);max-width:72ch}a{color:var(--accent);text-underline-offset:.22em}a:focus-visible,summary:focus-visible{outline:.18rem solid #f8cd78;outline-offset:.25rem}code{overflow-wrap:anywhere;background:#0b172c;padding:.08em .28em;border-radius:.25rem}
.eyebrow{color:var(--accent);font-size:.8rem;font-weight:750;letter-spacing:.13em}.actions{display:flex;flex-wrap:wrap;gap:.8rem 1.3rem;margin:1.2rem 0}.actions a{padding:.55rem .8rem;border:1px solid var(--line);border-radius:.6rem}
ol{padding:0;list-style-position:inside;display:grid;gap:.8rem;grid-template-columns:repeat(auto-fit,minmax(min(100%,18rem),1fr));margin:0}li,.notice,details{min-width:0;background:var(--surface);border:1px solid var(--line);border-radius:1rem;padding:1rem 1.15rem}li::marker{color:var(--accent);font-weight:750}li h3{display:inline;margin:0}li p{margin:.55rem 0 0}summary{cursor:pointer;color:var(--ink);font-weight:700}
</style></head><body><main id="contenu">
<header>
  <p class="eyebrow">WEALTHTECH MCP · GUIDE DE PARCOURS</p>
  <h1>Créer ou reprendre un dépôt gouverné</h1>
  <p>Deux parcours distincts, une même règle. Chaque action s’appuie sur des autorisations vérifiées et chaque étape affiche uniquement les preuves réellement disponibles.</p>
  <nav class="actions" aria-label="Points d’entrée"><a href="/dashboard">Tableau de bord MCP</a><a href="/admissions">Parcours après connexion</a><a href="https://github.com/Patricked-code/MCP/blob/main/docs/governance/cug-grt-capsule.md#guide-web-et-routes-de-référence">Documentation GitHub</a></nav>
</header>
<section aria-labelledby="etapes"><h2 id="etapes">Le parcours, étape par étape</h2>
<ol>
  <li><h3>Ouvrir depuis le client MCP</h3><p>Appeler <code>mcp_start_governed_request_auth</code> depuis le client OAuth CUG habilité. Utiliser le lien d’admission temporaire que le client retourne. Cette page de guide ne délivre pas de lien ni de jeton.</p></li>
  <li><h3>Choisir le bon compte</h3><p>L’admission vérifie le profil OAuth et l’installation GitHub App. Seuls les comptes et la cible autorisés sont utilisables. Le jeton du tableau de bord ne remplace pas le profil OAuth CUG.</p></li>
  <li><h3>Créer, si la création est autorisée</h3><p>Renseigner le dépôt, sa visibilité et l’objectif public. Confirmer séparément la publication du dossier dans GRT et la demande de création. Une transmission à GitHub ne prouve pas que le dépôt a été créé.</p></li>
  <li><h3>Reprendre sans relancer</h3><p>Utiliser l’identifiant de continuité. Le suivi web consulte le dossier central. La capsule MCP <code>mcp_resume_grt_repository_creation</code> peut ensuite lire le dossier local et ses preuves lorsque le transfert est vérifié. En cas de réception incertaine, consulter le statut avant tout nouvel envoi.</p></li>
</ol></section>
<section aria-labelledby="admission-modes"><h2 id="admission-modes">Choisir un parcours d’admission</h2>
<p>Ce guide décrit les entrées observées dans le code. La disponibilité effective dépend du client, de ses autorisations et de la configuration du serveur. Aucun choix affiché ici ne crée une session ni un droit.</p>
<ol>
  <li><h3>Connecter un client MCP par HTTP</h3><p>Le client MCP utilise <code>/mcp</code> comme point d’entrée protocolaire. Il ne s’agit pas d’une page à ouvrir dans un navigateur. L’authentification et la négociation de transport sont assurées par le client et le serveur ; ce guide ne fournit aucun jeton.</p></li>
  <li><h3>Admettre une demande CUG par OAuth</h3><p>Depuis un client OAuth CUG déjà autorisé, demander <code>mcp_start_governed_request_auth</code>, ouvrir uniquement le lien temporaire retourné, puis vérifier le même jeton OAuth et sélectionner une installation GitHub App autorisée. La présence d’un compte GitHub ne prouve pas son autorisation.</p></li>
  <li><h3>Créer ou adopter un dépôt</h3><p>Le formulaire GRT n’est proposé qu’après vérification de l’identité et de l’installation. Le parcours de création exige une confirmation explicite. L’adoption et les autres opérations restent conditionnées aux capacités réellement exposées par les outils gouvernés ; elles ne sont pas déclenchées par ce guide.</p></li>
  <li><h3>Observer ou reprendre un chantier</h3><p>Consulter <code>/admissions</code> après connexion pour les parcours disponibles, ou utiliser <code>mcp_resume_grt_repository_creation</code> lorsque l’identité, le dossier et les preuves de transfert sont vérifiés. Une réception incertaine doit être rapprochée avant toute nouvelle soumission.</p></li>
</ol>
<details><summary>Autres transports et accès historiques</summary><p>Le transport HTTP du client MCP, l’admission OAuth CUG et les événements webhook GitHub App remplissent des fonctions différentes. Un webhook signé est une source d’événements, pas une connexion utilisateur. Les modes SSE hérités, stdio ou autres ne sont pas annoncés comme disponibles sans preuve de configuration et de compatibilité du client. <code>/gouvern</code> conserve son parcours historique indépendant.</p></details>
</section>
<section aria-labelledby="catalogue"><h2 id="catalogue">Les dix entrées du parcours gouverné</h2>
<p>Ces entrées sont des objectifs ou des événements, et non dix authentifications indépendantes. « Conditionnel » signifie que l’accès exige des autorisations ou des capacités non attestées par cette page. Aucun lien ci-dessous ne déclenche une écriture.</p>
<ol>
<li><h3>01 · Client MCP</h3><p>Point protocolaire <code>/mcp</code>, à configurer dans un client compatible. <strong>Conditionnel :</strong> transport et authentification à négocier avec le serveur.</p></li>
<li><h3>02 · Autorisation OAuth</h3><p>Demander <code>mcp_start_governed_request_auth</code> depuis le client habilité. <strong>Conditionnel :</strong> même jeton OAuth et lien temporaire valide.</p></li>
<li><h3>03 · GitHub App CUG</h3><p>Vérifier l’installation et les permissions avant toute sélection de compte. <strong>Conditionnel :</strong> couverture effective de l’installation, non déduite de son identifiant.</p></li>
<li><h3>04 · Interface web</h3><p>Consulter le <a href="/dashboard">tableau de bord protégé</a> puis les <a href="/admissions">admissions</a>. <strong>Conditionnel :</strong> session et autorisations nécessaires.</p></li>
<li><h3>05 · API HTTP</h3><p>Accès programmatique uniquement aux routes publiées et autorisées. <strong>Non vérifié :</strong> aucune API REST générique d’admission n’est promise par ce guide.</p></li>
<li><h3>06 · Création ou adoption GRT</h3><p>Le questionnaire et la création sont soumis à l’identité admise, à la confirmation explicite et aux droits du dépôt. <strong>Conditionnel :</strong> ne jamais assimiler un reçu à une création.</p></li>
<li><h3>07 · Gouvernance GRGS</h3><p>Consulter les preuves et décisions dans le cockpit existant. <strong>Conditionnel :</strong> une preuve n’est ni une autorisation ni un déploiement.</p></li>
<li><h3>08 · Session gouvernée</h3><p>Associer l’acteur, la cible, les permissions et la continuité via les outils MCP gouvernés existants. <strong>Conditionnel :</strong> le login seul ne crée pas de session.</p></li>
<li><h3>09 · Webhook GitHub</h3><p>Réception et rapprochement d’événements vérifiés par le collecteur CUG. <strong>Événement technique :</strong> ce n’est pas une entrée utilisateur ni une preuve automatique de couverture.</p></li>
<li><h3>10 · Agent codeur</h3><p>Rattacher une tâche bornée à une session et à un projet après qualification et autorisation. <strong>Conditionnel :</strong> aucune tâche ni écriture n’est déclenchée depuis ce guide.</p></li>
</ol></section>
<section aria-labelledby="routes"><h2 id="routes">Quelle entrée utiliser ?</h2>
<details><summary>Accueil, admission ou pilote historique</summary>
<p><code>/</code> mène au tableau de bord protégé. <code>/index</code> et <code>/index.html</code> ne sont pas des points d’entrée. <code>/repo-template/auth</code> est réservé au lien d’admission CUG délivré par le client. Un <code>404</code> n’autorise pas à contourner l’admission. <code>/gouvern</code> reste le pilote historique distinct. <code>/mcp</code> est le point d’entrée du client MCP, pas une page web.</p>
</details></section>
<p class="notice">Le reçu de référence et le bilan GRGS, lorsqu’ils sont disponibles, ne valent ni autorisation de provisionner ni attestation de déploiement. Ce guide est statique et n’affiche aucune donnée de dossier, de compte ou de configuration.</p>
</main></body></html>`);
  });
  return router;
}
