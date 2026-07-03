# INTEGRATION_SOURCES_LOCALES_SITE_CHAINSOLUTIONS_20260702

Date UTC : 2026-07-02T06:00:48.987031+00:00
Mode : extraction documentaire et integration Loop Engineering uniquement.

## Sources lues
- `chainsolutions_docx` : `C:\Users\Koné ZIé Arouna\Documents\Chatgpt creation site chainsolutions.docx` ; taille `40367` ; SHA `d006b8b95903236c`
- `site_instruction_txt` : `C:\Users\Koné ZIé Arouna\Documents\instrucion brut site web wealthtech.txt` ; taille `2322` ; SHA `8b35eaa6e55b0176`
- `codex_wealthtech_template` : `C:\Users\Koné ZIé Arouna\Documents\GLOBAL (1)\wealthtech-workspace\CODEX_WEALTHTECH.md` ; taille `623` ; SHA `cac9f8f4b83544a6`
- `workspace_bootstrap` : `C:\Users\Koné ZIé Arouna\Documents\GLOBAL (1)\wealthtech-workspace\bootstrap_wealthtech_workspace.sh` ; taille `1732` ; SHA `73564038b0032078`
- `audit_launcher_ps1` : `C:\Users\Koné ZIé Arouna\Documents\MCP\lancer_audit_wealthtech_mcp.ps1` ; taille `36709` ; SHA `42c5c2693e485d56`
- Fichier volontairement non lu : `C:\Users\Kon? ZI? Arouna\Documents\API chatGPT.txt` ; raison : Filename indicates possible API secret; not read or copied.

## Ce que ces sources ajoutent au Loop Engineering
- Elles ajoutent un volet site corporate `chainsolutions.fr`, distinct du site principal WealthTech `wealthtechinnovations.com`, mais lie aux applications metier S2.
- Elles donnent une expression de besoin complete pour une refonte/creation SSR SEO-first avec pages par solution, blog, contact et panel admin.
- Elles confirment que les applications BRVM, profil investisseur, simulateur, edufinance et funds doivent etre presentees comme solutions reliees, avec redirections publiques.
- Elles renforcent la necessite de ne pas faire une SPA ou landing page vide: le contenu doit etre serveur, indexable et riche par URL.
- Elles creent un futur track H, a traiter apres securisation des tracks A/B/C, ou en parallele documentaire sans casser S2.

## Solutions ChainSolutions a presenter
- BRVM Research PRO : `https://brvm.chainsolutions.fr/`
- Profil Investisseur UEMOA : `https://profil.chainsolutions.fr/`
- Simulateur Epargne : `https://simulateur.chainsolutions.fr/`
- Parcours Epargnant UEMOA : `https://edufinance.chainsolutions.fr/`
- Funds / OPCVM Afrique : `https://funds.chainsolutions.fr/`

## Exigences fonctionnelles et techniques extraites
- Site corporate premium SSR, pas une SPA.
- Next.js App Router / TypeScript / rendu serveur indexable.
- Domaine canonique chainsolutions.fr meme si deploye derriere Google Cloud.
- Pages separees: accueil, a-propos, solutions, pages par solution, blog, contact, legales.
- SEO premium: metadata uniques, canonical, Open Graph, sitemap.xml, robots.txt, Schema.org, HTML semantique.
- Formulaire contact stocke en base, notification email, visible dans un panel superadmin.
- Panel superadmin securise: messages, statuts, blog CRUD, SEO articles.
- Pages solution riches, indexables, avec CTA vers applications externes.
- Design fintech/wealthtech premium, animations elegantes, responsive propre.
- Securite: validation serveur, anti-spam/rate limiting, sanitation, routes admin protegees.

## Extrait controle du besoin brut
> sur ce site il va présenter tous nos outils de finances et d'analyse, nos solutions pour les investisseurs et les sociétés de gestion qui sont présentées ici :
> https://tokenfactory.wealthtechinnovation.fr/
> https://evote.chainsolutions.fr/
> https://stablecoin.chainsolutions.fr/
> https://edufinance.chainsolutions.fr/
> https://funds.chainsolutions.fr/
> il devrai bien présenter toute sle solutions avec le sliens qui redirige vers les applications et un formulaire contact tu vas permettre d'envoyer des email par les visiteur et et ces email soit recçu dans un panel superadmin qui pourra les lires .
> le panel superadmin pourra aussi dans son interface d'aministration ajouter des nexs dans une page blogs depuis son interface d'administration .
> le site de chain solution doit avec aussi une url site maps et doit extre en nextjs avec Api micro service et être crée selon les bonne pratiques de référencement, et de schema org avec aussi tous les tags de réferencement prémiums, chaque solution doit être présenté sur une page avec sa description entière selon de contenu de l'application , avec toute les bonne spratiques de réfréencement et les url de redirection.
> chainsolututions doit être conçu pour être un site web indexable par google avec un sitemap , faut savoir que l'application sera deployé sur googlecloud avec une url de serveur mais cette url ser amappé pour eêtre sur chainsolutions.fr .
> donc le site doit être conçu pas comme une application monopage mais comme un vrai site internet coté serveur client SSR , pour avoir le meiller référencement possible avce un fichier intégré robot.
> tu comprends ce que je te demande faut le prompte qui va créer le meilleur site internet possible avec le plus beau disgn et des animation d'une vrai structure technologique dans la finance avec toute sles description des solutions qur la page d'accueil et aussi sur chaque page d'application,faut que la conceptions distingue plusieurs url par page d'applicatio avec des / et que chaque pages intègres toute sles meilleurs pratique de référencements et de tag .
> tu comprends ? tu peux d'abord bien me rediger cette expression de besoin .
> Puis ensuite le prompt complet pour la création de ce site internet avec gemini , nh'hesite à parcourir les url ?

## Extraction Word ChainSolutions
- Paragraphes extraits : 688
- Caracteres approx : 23515
- Le texte complet du Word est conserve dans ce fichier pour reprise IA.

### Texte complet extrait
Oui.J’ai d’abord reformulé votre besoin en expression de besoin claire et exploitable, puis je vous donne un prompt Gemini complet prêt à copier-coller.
Je précise un point de méthode : les pages BRVM Research PRO, Profil Investisseur UEMOA, Simulateur Épargne et Parcours Épargnant UEMOA sont publiquement identifiables par leurs titres, mais leur contenu textuel n’est pas entièrement récupérable dans l’outil de lecture utilisé. J’ai donc ancré la formulation sur leurs intitulés publics et sur un article de CIO Mag du 2 mars 2026 qui décrit leurs usages (analyse boursière, éducation financière, simulation d’épargne, profilage investisseur). La plateforme funds.chainsolutions.fr est, elle, lisible en texte et présente explicitement des services liés aux OPCVM africains, au conseil institutionnel, au KYC digitalisé et au robo-advisory. (BRVM Research PRO)
J’ai aussi orienté le prompt vers un vrai site SSR indexable, car Next.js prévoit des conventions dédiées pour robots.txt et sitemap.xml, et Google recommande bien d’utiliser le sitemap pour faciliter la découverte des URLs, tandis que le robots.txt sert à piloter le crawl (et non à “cacher” un site). Google rappelle aussi que les données structurées doivent décrire le contenu réellement visible sur la page. (Next.js)
Voici d’abord l’expression de besoin, prête à relire ou à transmettre telle quelle.
Expression de besoin — Site corporate SSR de Chainsolutions.fr
1) Objet du projet
Créer le site internet officiel chainsolutions.fr comme site corporate premium, vitrine technologique et commerciale, destiné à présenter l’ensemble des solutions développées par Chainsolutions dans les domaines de la finance, de l’analyse financière, de l’éducation financière, de l’accompagnement des investisseurs et des services aux sociétés de gestion.
Le site ne doit pas être conçu comme une simple application monopage, mais comme un véritable site web indexable, structuré en plusieurs pages et sous-pages, avec rendu SSR (server-side rendering) et architecture moderne permettant un référencement naturel maximal sur Google.
2) Finalité business
Le site doit remplir plusieurs objectifs simultanés :
Présenter de manière claire, premium et crédible l’écosystème Chainsolutions.
Donner une image de structure fintech / wealthtech sérieuse, innovante et institutionnelle.
Mettre en avant les différentes solutions existantes avec une forte orientation conversion.
Rediriger les visiteurs vers les applications existantes.
Générer des prises de contact qualifiées via un formulaire.
Permettre un pilotage éditorial simple via un panel superadmin.
Servir de base SEO forte pour le nom de marque Chainsolutions et pour chaque solution.
3) Solutions à mettre en avant
Le site devra présenter au minimum les solutions suivantes, chacune avec une page dédiée et un lien de redirection vers l’application concernée :
BRVM Research PROURL cible : https://brvm.chainsolutions.fr/
Profil Investisseur UEMOAURL cible : https://profil.chainsolutions.fr/
Simulateur ÉpargneURL cible : https://simulateur.chainsolutions.fr/
Parcours Épargnant UEMOAURL cible : https://edufinance.chainsolutions.fr/
Funds / plateforme OPCVM AfriqueURL cible : https://funds.chainsolutions.fr/
Chaque solution devra être :
valorisée sur la page d’accueil ;
détaillée sur sa propre page ;
reliée à un bouton d’action clair de type :
Découvrir la solution
Accéder à l’application
En savoir plus
Demander une démonstration
4) Positionnement et image de marque
Le site doit refléter :
une image haut de gamme ;
une identité technologique, financière, institutionnelle ;
une direction artistique moderne, crédible et ambitieuse ;
des animations élégantes rappelant les codes de la fintech, de la data, de la visualisation et de l’innovation.
Le design recherché doit évoquer :
la finance moderne,
la data intelligence,
l’IA appliquée à la décision,
la transformation digitale des services financiers,
la confiance, la sécurité, la précision, la performance.
5) Exigences fonctionnelles principales
A. Front public
Le site devra contenir a minima :
une page d’accueil très travaillée ;
une page À propos ;
une page Solutions ;
une page dédiée pour chaque application ;
une page Services (si besoin, distincte des pages solutions) ;
une page Blog / Actualités ;
une page Contact ;
les pages légales (mentions légales, confidentialité, cookies si nécessaire).
B. Présentation des solutions
Chaque page solution devra inclure :
un titre optimisé SEO ;
une présentation complète de la solution ;
sa proposition de valeur ;
ses cas d’usage ;
ses cibles (investisseurs, épargnants, institutions, sociétés de gestion, etc.) ;
ses bénéfices ;
des blocs visuels premium ;
un bouton de redirection vers l’outil ;
éventuellement une FAQ ;
des contenus conçus pour bien se positionner sur Google.
C. Formulaire de contact
Le site doit intégrer un formulaire de contact fonctionnel permettant aux visiteurs :
d’envoyer un message ;
de renseigner nom, email, société, sujet, message ;
éventuellement de préciser leur profil (investisseur, société de gestion, partenaire, média, autre).
Le système doit :
envoyer un email de notification ;
stocker le message en base ;
rendre le message visible dans un panel superadmin.
D. Panel superadmin
Un espace d’administration sécurisé doit permettre :
de consulter les messages reçus ;
de lire le détail de chaque prise de contact ;
de marquer les messages (nouveau, lu, traité, archivé) ;
de publier, modifier, supprimer des articles dans la rubrique Blog / Actualités ;
de gérer les statuts de publication ;
idéalement de gérer les métadonnées SEO des articles.
6) Exigences techniques
Le site doit être réalisé en :
Next.js (architecture moderne, SSR)
avec une approche client + server adaptée au référencement
et une couche API / microservices pour les fonctions métier (contact, administration, blog, etc.)
Le projet doit être pensé comme un site web corporate SEO-first, pas comme une SPA.
7) Exigences SEO et indexation
Le site doit être conçu dès le départ pour un référencement premium :
URLs propres et hiérarchisées ;
structure multi-pages avec slugs lisibles ;
balises meta premium par page ;
titres SEO uniques ;
descriptions SEO uniques ;
Open Graph / réseaux sociaux ;
balises canoniques ;
maillage interne logique ;
HTML sémantique ;
contenus indexables ;
fichier robots intégré ;
sitemap XML accessible ;
compatibilité Google Search Console ;
données structurées Schema.org pertinentes ;
optimisation du rendu SSR pour garantir l’indexabilité.
8) Arborescence souhaitée (exemple)
Le site doit avoir une logique d’URLs claire, par exemple :
/
/a-propos
/solutions
/solutions/brvm-research-pro
/solutions/profil-investisseur-uemoa
/solutions/simulateur-epargne
/solutions/parcours-epargnant-uemoa
/solutions/funds-opcvm-afrique
/blog
/blog/[slug]
/contact
/mentions-legales
/politique-confidentialite
Et côté administration :
/admin
/admin/login
/admin/messages
/admin/messages/[id]
/admin/blog
/admin/blog/nouveau
/admin/blog/[id]/edit
9) Hébergement et domaine
Le site sera déployé sur Google Cloud avec une URL serveur technique, mais le domaine final visible et prioritaire devra être :
https://chainsolutions.fr
Le site devra donc être pensé pour :
fonctionner derrière un mapping de domaine personnalisé ;
considérer chainsolutions.fr comme domaine canonique ;
éviter toute confusion SEO entre l’URL serveur et le domaine final.
10) Niveau de qualité attendu
Le résultat attendu n’est pas un simple “site vitrine basique”, mais un site corporate premium de très haut niveau, avec :
design fort,
expérience utilisateur fluide,
animations élégantes,
logique commerciale claire,
structure éditoriale solide,
performance technique,
excellent niveau SEO,
back-office réellement exploitable.
11) Livrable attendu
Le livrable attendu est un site complet, prêt à être développé ou généré, comprenant :
l’architecture technique ;
l’arborescence ;
les pages ;
les composants ;
les contenus de présentation ;
les redirections vers les applications ;
le module de contact ;
le panel d’administration ;
le blog ;
le SEO technique ;
les fichiers robots/sitemap ;
les schémas structurés ;
et une base propre pour déploiement sur Google Cloud.
Voici maintenant le prompt Gemini complet, rédigé pour pousser Gemini à produire un site très abouti, structuré, SEO-first et orienté image de marque.
Tu es un architecte logiciel senior, un lead Next.js full-stack, un expert SEO technique, un UX/UI designer premium orienté fintech, et un expert en structuration de sites corporate haut de gamme.
Ta mission est de concevoir et générer un site internet corporate complet pour chainsolutions.fr, avec une qualité premium, un rendu institutionnel, un design très soigné, une architecture SEO-first, une logique SSR forte, une arborescence multi-pages, un panel d’administration sécurisé, et une expérience utilisateur digne d’une structure technologique de haut niveau dans la finance.
Le site doit être conçu comme un vrai site web corporate indexable par Google, et non comme une application monopage.
1) OBJECTIF GLOBAL
Créer le site officiel Chainsolutions pour présenter l’ensemble de nos solutions financières, d’analyse, d’éducation financière et de services destinés :
aux investisseurs particuliers,
aux épargnants,
aux investisseurs plus avancés,
aux sociétés de gestion,
aux institutions financières,
aux partenaires,
aux prospects corporate.
Le site doit :
présenter clairement toutes nos solutions ;
valoriser notre image de marque ;
créer de la confiance ;
générer des leads via un formulaire de contact ;
rediriger vers chacune de nos applications ;
permettre à un superadmin de gérer les messages et le blog.
2) CONTRAINTE FONDAMENTALE
Le site doit être construit en Next.js, avec une architecture moderne orientée :
SSR / Server Components
App Router
rendu indexable côté serveur
pages distinctes par URL
excellente performance
SEO technique premium
structure modulaire et scalable
Interdiction de concevoir le projet comme une simple SPA.
Je veux un vrai site corporate avec :
pages séparées,
slugs propres,
contenu indexable,
arborescence logique,
sitemap,
robots,
tags SEO avancés,
données structurées,
maillage interne intelligent.
3) CONTEXTE MARQUE
Chainsolutions est une structure technologique orientée finance, analyse, éducation financière, data, innovation et solutions digitales au service :
de l’investissement,
de l’accompagnement des investisseurs,
de la compréhension des marchés,
des sociétés de gestion,
de la valorisation des offres financières,
de la transformation digitale du secteur financier.
Le site doit transmettre les notions suivantes :
crédibilité
rigueur
innovation
intelligence financière
modernité
sécurité
performance
technologie
conseil
vision long terme
Le ton du site doit être :
professionnel
premium
institutionnel
accessible
clair
convaincant
moderne
4) SOLUTIONS À PRÉSENTER
Le site doit intégrer une présentation premium et détaillée des solutions suivantes, avec une page dédiée pour chacune et un lien de redirection vers l’application existante.
Solution 1 — BRVM Research PRO
URL externe : https://brvm.chainsolutions.fr/
Positionnement : solution d’intelligence financière et d’analyse boursière orientée BRVM
La page dédiée doit présenter :
la valeur de l’outil,
son intérêt pour l’analyse financière,
son utilité pour la lecture et la compréhension des marchés,
son intérêt pour les investisseurs et les utilisateurs souhaitant mieux comprendre les sociétés cotées.
Solution 2 — Profil Investisseur UEMOA
URL externe : https://profil.chainsolutions.fr/
Positionnement : outil de qualification / profilage investisseur
La page dédiée doit présenter :
la logique de profilage,
l’aide à la prise de décision,
l’adaptation des solutions au profil de risque et aux objectifs.
Solution 3 — Simulateur Épargne
URL externe : https://simulateur.chainsolutions.fr/
Positionnement : outil de simulation d’épargne et de projection
La page dédiée doit présenter :
la visualisation d’un effort d’épargne,
la projection long terme,
la pédagogie financière,
la capacité de transformer un objectif en trajectoire chiffrée.
Solution 4 — Parcours Épargnant UEMOA
URL externe : https://edufinance.chainsolutions.fr/
Positionnement : parcours pédagogique / éducation financière
La page dédiée doit présenter :
une logique d’apprentissage,
une approche progressive,
la compréhension des notions de rendement, risque, investissement, épargne,
une expérience éducative interactive.
Solution 5 — Funds / OPCVM Afrique
URL externe : https://funds.chainsolutions.fr/
Positionnement : plateforme autour des OPCVM africains, de l’analyse, du conseil et de la mise en visibilité de solutions de gestion
La page dédiée doit présenter :
l’univers des fonds / OPCVM,
l’analyse et la comparaison de fonds,
la logique de conseil institutionnel,
la technologie financière,
l’innovation,
les dimensions KYC / conformité / visibilité / distribution.
5) OBJECTIF UX ET DESIGN
Je veux un design exceptionnel, très haut de gamme, au niveau d’une vraie structure fintech / wealthtech.
Le style visuel doit être :
élégant
futuriste
premium
technologique
fluide
crédible pour des acteurs financiers
Direction artistique souhaitée
Créer une identité visuelle mêlant :
finance institutionnelle
innovation digitale
data visualisation
sobriété premium
animation moderne
sensation de maîtrise technologique
Exigences design
hero section très forte
sections visuelles différenciées
animations douces et fluides
transitions premium
illustrations / motifs évoquant la data, les marchés, les flux, les signaux, les connexions
excellent responsive
rendu desktop particulièrement premium
mobile propre, rapide et lisible
contraste maîtrisé
hiérarchie visuelle forte
calls-to-action visibles
composants réutilisables
Ambiance recommandée
fonds élégants (clairs ou sombres, mais premium)
effets de profondeur
verre / blur léger si pertinent
micro-animations
lignes, grilles, halos, particules ou motifs discrets inspirés de la tech financière
iconographie cohérente
mise en page très structurée
6) STRUCTURE DU SITE (ARBORESCENCE)
Construis le site avec des URLs claires et hiérarchisées.
Front public
/
/a-propos
/solutions
/solutions/brvm-research-pro
/solutions/profil-investisseur-uemoa
/solutions/simulateur-epargne
/solutions/parcours-epargnant-uemoa
/solutions/funds-opcvm-afrique
/services (si utile)
/blog
/blog/[slug]
/contact
/mentions-legales
/politique-confidentialite
Administration
/admin
/admin/login
/admin/messages
/admin/messages/[id]
/admin/blog
/admin/blog/nouveau
/admin/blog/[id]/edit
7) CONTENU DE LA PAGE D’ACCUEIL
La page d’accueil doit être très riche, complète et orientée conversion.
Sections recommandées
1. Hero premium
message clair sur Chainsolutions
positionnement fintech / finance / analyse / innovation
promesse forte
CTA vers les solutions
CTA contact
visuel/animation premium
2. Présentation courte de Chainsolutions
qui nous sommes
mission
vision
à qui s’adresse la plateforme
approche : finance + technologie + expérience utilisateur
3. Grille des solutions
Présenter les 5 solutions sous forme de cartes premium :
titre
bénéfice principal
mini description
CTA vers page détaillée
CTA vers application externe
4. Pourquoi choisir Chainsolutions
expertise
innovation
vision orientée usages
accessibilité
logique d’accompagnement
valeur ajoutée pour les investisseurs et les institutions
5. Bloc “Pour qui ?”
investisseurs particuliers
épargnants
sociétés de gestion
institutions
partenaires
6. Bloc “Méthode / Approche”
simplicité
pédagogie
structuration de l’information
orientation décisionnelle
innovation utile
7. Bloc actualités / blog
derniers articles
CTA vers blog
8. Bloc contact / lead generation
invitation à demander une démonstration
formulaire simplifié ou CTA vers page contact
9. Footer premium
navigation
liens solutions
mentions légales
contact
réseaux (si disponibles)
copyright
8) PAGE “SOLUTIONS”
Créer une page /solutions qui sert de hub SEO et commercial.
Elle doit contenir :
intro générale
résumé de l’offre globale
sections dédiées à chaque solution
liens vers pages détaillées
liens vers applications externes
FAQ possible
CTA final de contact
9) PAGES DÉDIÉES PAR SOLUTION
Chaque solution doit avoir une page dédiée très complète et SEO-friendly.
Structure recommandée pour chaque page solution
H1 unique
introduction claire
contexte / problème adressé
proposition de valeur
fonctionnalités / bénéfices
cas d’usage
profils cibles
pourquoi cette solution est utile
CTA “Accéder à l’application”
FAQ éventuelle
bloc contact
liens internes vers autres solutions
Important
Ne pas faire une page vide avec juste un bouton.Chaque page doit être une vraie landing page SEO, riche, indexable, utile, cohérente et convaincante.
10) PAGE CONTACT + GESTION DES MESSAGES
Créer une page /contact avec :
formulaire complet
champs :
nom
prénom (optionnel)
email
téléphone (optionnel)
société (optionnel)
type de profil (investisseur, société de gestion, institution, partenaire, média, autre)
sujet
message
consentement confidentialité
Fonctionnement attendu
À la soumission :
valider les champs côté client et côté serveur ;
enregistrer le message en base ;
envoyer une notification email ;
afficher un message de confirmation propre ;
rendre le message visible dans l’interface admin.
Exigences anti-abus
validation stricte
anti-spam
rate limiting
captcha ou protection équivalente
sanitation des entrées
journalisation d’erreurs propre
11) PANEL SUPERADMIN
Créer une interface d’administration sécurisée.
Fonctionnalités minimales
A. Authentification admin
login sécurisé
gestion de session
routes protégées
B. Gestion des messages
liste des messages reçus
lecture du détail
statut : nouveau / lu / traité / archivé
filtres
tri par date
C. Gestion du blog
créer un article
modifier un article
supprimer un article
publier / dépublier
champs SEO des articles
slug automatique ou contrôlé
aperçu si possible
D. Optionnel recommandé
tableau de bord admin
compteurs : messages reçus, articles publiés, brouillons
recherche interne
12) BLOG / ACTUALITÉS
Créer une vraie section éditoriale.
Front blog
page liste /blog
cartes d’articles
image de couverture
titre
extrait
date
auteur (si utile)
pagination ou chargement intelligent
Articles
page /blog/[slug]
structure SEO propre
H1
contenu riche
partage social
fil d’Ariane
article related posts
schema BlogPosting
Admin blog
Le superadmin doit pouvoir gérer les articles sans modifier le code.
13) SEO TECHNIQUE — OBLIGATOIRE
Le site doit être construit avec une logique SEO premium native.
À implémenter systématiquement
balise <title> unique par page
meta description unique par page
canonical par page
Open Graph
Twitter cards
balises robots adaptées
hiérarchie H1/H2/H3 propre
URLs propres
internal linking
contenu textuel indexable
images optimisées
alt text
performance web
accessibilité correcte
HTML sémantique
Fichiers techniques SEO
Créer :
robots.txt
sitemap.xml
Données structurées Schema.org
Implémenter selon la page :
Organization
WebSite
BreadcrumbList
Service ou SoftwareApplication pour les pages solutions
BlogPosting pour les articles
ContactPage pour la page contact
FAQPage uniquement si une vraie FAQ visible est affichée
Très important
Les schémas structurés doivent correspondre au contenu réellement visible sur la page.
14) INDEXATION ET DOMAINE CANONIQUE
Le site sera techniquement déployé sur Google Cloud avec une URL serveur, mais sera mappé sur :
https://chainsolutions.fr
Tu dois donc concevoir le projet pour que :
le domaine canonique principal soit https://chainsolutions.fr
toutes les balises canoniques pointent vers chainsolutions.fr
le sitemap référence les URLs finales en https://chainsolutions.fr
les URLs du site soient pensées pour être stables et propres
aucune logique ne traite l’URL technique comme domaine principal côté SEO
Prévois aussi une base prête pour :
Google Search Console
Google Analytics / équivalent
suivi d’événements de conversion
15) STACK TECHNIQUE RECOMMANDÉE
Je veux une proposition moderne, robuste et propre.
Front / full-stack
Next.js (App Router)
TypeScript
composants réutilisables
architecture claire
SEO-first
Server Components dès que pertinent
Client Components seulement si nécessaire
UI
design system cohérent
composants propres
animations premium
accessibilité correcte
responsive de qualité
API / logique métier
routes API sécurisées
services séparés et structurés
logique contact
logique blog
logique admin
validation stricte
Data
Propose une structure simple et robuste pour :
messages contact
articles blog
utilisateurs admin
Sécurité
authentification admin sécurisée
hashage des mots de passe
protections CSRF si nécessaire
validation côté serveur
sanitation
rate limiting
logs propres
headers de sécurité
protection des routes admin
gestion des erreurs sans fuite d’infos sensibles
16) ARCHITECTURE DE DOSSIERS
Propose une architecture de code propre, évolutive et professionnelle.
Par exemple :
app/
components/
lib/
services/
schemas/
types/
content/ ou système admin
public/
app/api/...
Je veux une organisation lisible, maintenable et prête à évoluer.
17) LIVRABLE ATTENDU DE TA PART
Je veux que tu génères un résultat très complet comprenant :
A. L’architecture globale du projet
structure des dossiers
logique des pages
logique des routes
séparation front / logique métier
B. Le code des pages principales
page d’accueil
page solutions
page dédiée par solution
page contact
page blog
page article
pages admin principales
C. Les composants réutilisables
header
footer
hero
solution cards
CTA sections
formulaire
cards blog
breadcrumbs
etc.
D. La logique fonctionnelle
envoi et stockage des messages
lecture admin
CRUD blog
auth admin
E. Le SEO complet
metadata par page
canonical
OG
robots
sitemap
JSON-LD
recommandations de contenu
F. Le design
proposer une direction artistique cohérente
styles premium
animations élégantes
rendu institutionnel-fintech
18) EXIGENCES DE QUALITÉ DE GÉNÉRATION
Le résultat ne doit pas être superficiel.
Je veux :
une réponse très détaillée
une logique professionnelle
un vrai niveau de production
pas de pseudo-démo trop simple
pas de site “template banal”
pas de simple landing page générique
pas de structure plate
pas de contenu vide
Je veux une vraie base premium, crédible, exploitable, et pensée pour être la vitrine officielle de Chainsolutions.
19) ORIENTATION COPYWRITING
Rédige les textes du site avec un ton :
premium
institutionnel
technologique
accessible
orienté valeur
rassurant
convaincant
Évite le jargon inutile.Les textes doivent inspirer :
confiance
expertise
innovation
clarté
sérieux
20) INSTRUCTION FINALE
Génère le meilleur site internet possible pour Chainsolutions, avec :
design premium,
structure multi-pages,
SEO technique de haut niveau,
pages dédiées à chaque solution,
redirection vers les applications existantes,
formulaire de contact relié à un panel superadmin,
blog administrable,
architecture Next.js SSR propre,
sitemap,
robots,
schema.org,
contenu riche et indexable,
performance,
sécurité,
et une présentation digne d’une vraie entreprise technologique spécialisée en finance.
Commence par :
proposer l’architecture complète du site ;
détailler l’arborescence ;
détailler les pages et contenus ;
détailler la stack et la logique technique ;
générer ensuite la structure de code et les principaux fichiers ;
inclure toutes les métadonnées SEO, les schémas et les routes nécessaires ;
fournir un résultat cohérent, complet et directement exploitable.
Deux améliorations très importantes à garder absolument dans la version finale :
Le domaine canonique doit toujours être https://chainsolutions.fr, même si le site est servi derrière une URL technique Google Cloud.
Le site doit rester un vrai site SSR multi-pages, avec contenu éditorial réel par page, sinon vous perdez une partie de l’intérêt SEO et du potentiel d’indexation. (Google for Developers)
Je peux ensuite vous rédiger une version encore plus puissante du prompt, orientée “Gemini code generator”, avec arborescence de fichiers, tables de base de données, routes API et composants .tsx déjà imposés.Souhaitez-vous que je vous prépare cette version 2, encore plus technique et directement orientée génération de code ?

## Script audit MCP local
- Le script local `lancer_audit_wealthtech_mcp.ps1` confirme les listes S1/S2, domaines proteges, sources migration et l approche read-only.
- Il est indexe par lignes clefs seulement, pas copie integralement dans la memoire.
- L2: # WEALTHTECH / EWARI / STABLECOIN
- L3: # LANCEUR WINDOWS -> SERVEUR MCP -> AUDIT READ-ONLY S1 + S2
- L6: # C:\Users\KonÃ© ZIÃ© Arouna\Documents\MCP\lancer_audit_wealthtech_mcp.ps1
- L10: # - se connecte au serveur MCP hÃ©bergÃ© sur S1 ;
- L11: # - crÃ©e sur le MCP un script Bash d'audit ;
- L12: # - lance un audit lecture seule de S1 et S2 ;
- L13: # - crÃ©e un rapport Markdown + HTML + archive ;
- L15: # - tÃ©lÃ©charge les rapports dans ton dossier Windows MCP.
- L20: # - aucune modification destructive sur S1/S2 ;
- L22: # - audit lecture seule uniquement.
- L31: # Serveur qui hÃ©berge le MCP.
- L32: # D'aprÃ¨s ta derniÃ¨re prÃ©cision, le serveur MCP est S1.
- L33: $McpSsh = "root@212.227.212.33"
- L35: # Dossier local Windows oÃ¹ les rapports seront enregistrÃ©s.
- L38: # Serveurs Ã  auditer depuis le MCP.
- L39: $S1Ssh = "root@212.227.212.33"
- L40: $S2Ssh = "root@217.160.249.254"
- L42: # Dossiers distants sur le serveur MCP.
- L43: $RemoteReportBase = "/root/wealthtech_audit_reports"
- L44: $RemoteMemoryBase = "/root/wealthtech_project_memory"
- L45: $RemoteScriptPath = "/root/wealthtech_mcp_global_audit.sh"
- L46: $RemoteLastPaths = "/root/wealthtech_audit_reports/LAST_AUDIT_PATHS.env"
- L65: $LocalRunDir = Join-Path $LocalRoot "audit_$RunId"
- L68: $LocalRemoteScript = Join-Path $LocalRunDir "wealthtech_mcp_global_audit.sh"
- L70: $LocalPathInfo = Join-Path $LocalRunDir "chemins_rapport_$RunId.txt"
- L91: Write-Step "Serveur MCP configurÃ© : $McpSsh"
- L92: Write-Step "S1 configurÃ© : $S1Ssh"
- L93: Write-Step "S2 configurÃ© : $S2Ssh"
- L96: # 3. SCRIPT BASH DISTANT Ã€ CRÃ‰ER SUR LE SERVEUR MCP
- L108: S1_SSH="${S1_SSH:-root@212.227.212.33}"
- L109: S2_SSH="${S2_SSH:-root@217.160.249.254}"
- L111: BASE_DIR="${REMOTE_REPORT_BASE:-/root/wealthtech_audit_reports}"
- L112: MEMORY_DIR="${REMOTE_MEMORY_BASE:-/root/wealthtech_project_memory}"
- L114: OUT_DIR="${BASE_DIR}/audit_${RUN_ID}"
- L120: REPORT_MD="${OUT_DIR}/RAPPORT_AUDIT_GLOBAL_WEALTHTECH_${RUN_ID}.md"
- L121: REPORT_HTML="${OUT_DIR}/RAPPORT_AUDIT_GLOBAL_WEALTHTECH_${RUN_ID}.html"
- L122: ARCHIVE="${BASE_DIR}/RAPPORT_AUDIT_GLOBAL_WEALTHTECH_${RUN_ID}.tar.gz"
- L123: LAST_PATHS="${BASE_DIR}/LAST_AUDIT_PATHS.env"
- L133: S1_KEEP_DOMAINS=(
- L137: "wealthtechinnovations.com"
- L138: "api.wealthtechinnovations.com"
- L139: "stablecoin.wealthtechinnovations.com"
- L140: "api.stablecoin.wealthtechinnovations.com"
- L141: "blockchain.wealthtechinnovations.com"
- L142: "tokenfactory.wealthtechinnovations.com"
- L143: "wealthtechinnovation.com"
- L147: S1_TARGET_DOMAINS=(
- L148: "V2.wealthtechinnovations.com"
- L149: "evote.wealthtechinnovations.com"
- L150: "api.evote.wealthtechinnovations.com"
- L151: "evaluations.wealthtechinnovations.com"
- L152: "api.evaluations.wealthtechinnovations.com"
- L155: S2_PROTECTED_DOMAINS=(
- L156: "africafunds.chainsolutions.fr"
- L157: "api.africafunds.chainsolutions.fr"
- L158: "api.stablecoin.chainsolutions.fr"
- L159: "stablecoin.chainsolutions.fr"
- L160: "brvm.chainsolutions.fr"
- L161: "bvmac.chainsolutions.fr"
- L162: "chainsolutions.fr"
- L163: "Funds.chainsolutions.fr"
- L164: "api.funds.chainsolutions.fr"
- L167: S2_DELETE_DOMAINS=(
- L168: "api.pccet.wealthtechinnovations.ci"
- L169: "api.wealthtechinnovations.ci"
- L170: "evote.wealthtechinnovations.ci"
- L171: "pccet.wealthtechinnovations.ci"
- L172: "wealthtechinnovations.ci"
- L173: "opcvm.chainsolutions.fr"
- L176: S2_BACKUP_CLEAN_DOMAINS=(
- L180: "iso20022.chainsolutions.fr"
- L181: "mutualfunds.chainsolutions.fr"
- L182: "opcvm.chainsolutions.fr"
- L183: "robot.funds.chainsolutions.fr"
- L184: "api-mutualfunds.chainsolutions.fr"
- L187: S2_MIGRATION_SOURCES=(
- L188: "wealthtech.chainsolutions.fr"
- L189: "evote.chainsolutions.fr"
- L190: "api.evote.chainsolutions.fr"
- L191: "itic4fima.chainsolutions.fr"
- L192: "api.itic4fima.chainsolutions.fr"
- L193: "stablecoin.chainsolutions.fr"
- L194: "api.stablecoin.chainsolutions.fr"
- L197: HTTP_URLS=(
- L201: "https://wealthtechinnovations.com"
- L202: "https://api.wealthtechinnovations.com"
- L203: "https://stablecoin.wealthtechinnovations.com"
- L204: "https://api.stablecoin.wealthtechinnovations.com"
- L205: "https://blockchain.wealthtechinnovations.com"
- L206: "https://tokenfactory.wealthtechinnovations.com"
- L207: "https://wealthtechinnovation.com"
- L209: "https://V2.wealthtechinnovations.com"
- L210: "https://evote.wealthtechinnovations.com"
- L211: "https://api.evote.wealthtechinnovations.com"
- L212: "https://evaluations.wealthtechinnovations.com"
- L213: "https://api.evaluations.wealthtechinnovations.com"
- L214: "https://africafunds.chainsolutions.fr"
- L215: "https://api.africafunds.chainsolutions.fr"
- L216: "https://api.stablecoin.chainsolutions.fr"
- L217: "https://stablecoin.chainsolutions.fr"
- L218: "https://brvm.chainsolutions.fr"
- L219: "https://bvmac.chainsolutions.fr"
- L220: "https://chainsolutions.fr"
- L221: "https://Funds.chainsolutions.fr"
- L222: "https://api.funds.chainsolutions.fr"
- L223: "https://api.pccet.wealthtechinnovations.ci"
- L224: "https://api.wealthtechinnovations.ci"
- L225: "https://evote.wealthtechinnovations.ci"
- L226: "https://pccet.wealthtechinnovations.ci"
- L227: "https://wealthtechinnovations.ci"
- L228: "https://opcvm.chainsolutions.fr"
- L229: "https://wealthtech.chainsolutions.fr"
- L230: "https://api.evote.chainsolutions.fr"
- L231: "https://evote.chainsolutions.fr"
- L232: "https://itic4fima.chainsolutions.fr"
- L233: "https://api.itic4fima.chainsolutions.fr"
- L254: "MIGRATION.md"
- L261: "SERVER_S1_STATE.md"
- L262: "SERVER_S2_STATE.md"
- L269: "MIGRATION_HISTORY.md"

## Regle d usage
- Ces exigences doivent nourrir une future boucle site corporate ChainSolutions, sans confondre avec A4 `wealthtechinnovations.com`.
- Avant implementation, verifier les domaines et l etat courant S2; aucune modification de `chainsolutions.fr` sans validation explicite.
