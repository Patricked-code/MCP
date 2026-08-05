# ProcÃ©dure officielle de mise Ã  jour du registre MCP

Date : 2026-08-05
Statut : **AUDIT / DOCUMENTATION UNIQUEMENT**
Effet runtime : **AUCUN**
Build, restart, dÃ©ploiement, suppression, purge, reset, clean, pull et merge : **NON AUTORISÃ‰S pendant cette phase**

## 1. Objet

Ce document dÃ©finit comment mettre Ã  jour durablement les informations du MCP relatives :

- aux comptes GitHub reconnus ;
- aux dÃ©pÃ´ts dÃ­couverts ;
- aux mappings dÃ©pÃ´t â†’ projet â†” serveur â†” rÃ©pertoire â†’ domaine ;
- aux branches officielles ;
- aux capacitÃ©s autorisÃ©es ;
- aux migrations de domaines ;
- Ã  lâ€™alignement GitHub â†’ S1 â†’ image Docker.

Lâ€™objectif est d`â€™Ã©viter les ajouts directs de chemins, dÃ©pÃ´ts ou permissions dans des modules TypeScript isolÃ©s.

## 2. Sources canoniques actuelles

| Domaine | Fichier |
|---|---|
| Comptes GitHub durables | `data/github-accounts.json` |
| Registre GitHub / mappings | `data/mcp-git-registry.json` |
| Serveurs et domaines protÃ©gÃ©s | `.mcp/server-map.json` |
| Permissions gÃ©nÃ©rales | `.mcp/permissions.json` |
| Cartographie des fonctions | `.mcp/function-cartography.json` |
| IdentitÃ© et traÃ§abilitÃ© | `.mcp/identity-policy.json` |
| Gouvernance Git | `.mcp/branch-governance.json` |

Les tokens et secrets restent exclusivement sous `/app/secrets/*`. Aucun token ne doit Ãªtre enregistrÃ© dans Git.

## 3. Persistance actuelle

Le fichier `docker-compose.yml` monte :

- `./data:/app/data`
- `./secrets:/app/secrets`
- `./logs:/app/logs`
- `./keys:/app/keys:ro`

ConsÃ©quence :

- les comptes et mappings sous `/app/data` persistent au-delÃ  dâ€™un rebuild ou restart ;
- une modification de donnÃ©es du registre ne nÃ©cessite pas nÃ©cessairement un rebuild ;
- une modification du code, du frontend, des validations ou des outils exige une nouvelle image ;
- les secrets ne doivent jamais etre copies dans les fichiers du registre.

## 4. Comptes GitHub durables

Le fichier `data/github-accounts.json` rÃ©fÃ©rence actuellement :

- `chainsolutions-wealthtech` comme organisation cible ;
- `Patricked-code` comme compte source ;
- `Wealthtechinnovations` comme compte secondaire en attente de synchronisation S2.

Le module `src/tools/durableAccounts.ts` :

- lit les tokens uniquement sous `/app/secrets/*` ;
- vÃ©rifie GitHub avec `/user` et `/orgs/<owner>` ;
- ne montre jamais le token ;
- ne clone, ne pousse, ne supprime et ne modifie aucun dÃ©pÃ´t ;
- expose `github_durable_accounts_status` et `github_durable_accounts_inventory`.

Une connexion GitHub reconnue doit rester enregistrÃ©e meme si lâ€™app MCP disparait temporairement dâ€™une conversation.

## 5. Registre Git v1 actuel

Le registre v1 contient :

- `accounts`
- `repoMappings`
- `auditEvents`
- `activeContext`

Chaque mapping exige aujourdâ€™:

- `githubOwner`
- `githubRepo`
- `projectKey`
- `serverId`
- `serverPath`
- `officialBranch`
- `allowedAccess`
- `deployEnabled`

Limites identifiÃ©es :

1. absence de status `discovered/proposed/validated/active/suspended` ;
2. absence de distinction source / cible / dÃ©pÃ´t actif ;
3. absence de validation `realpath` usagÃ©e ;
4. absence de capacitÃ©s dÃ©taillÃ©es par projet ;
5. absence de rollback du registre ;
6. chemin thÃ©orique crÃ©Ã© automatiquement pour les dÃ©pÃ´ts dÃ©souverts ;
7. rÃ©solution par dÃ©faut vers `mcp_bridge` si aucun mapping explicite nâ€™est trouvÃ© ;
8. `deployEnabled` insuffisant pour reprÃ©senter la sÃ©curitÃ© dâ€™un dÃ©loiement ;
9. frontend en lecture/connexion, sans CRUD administratif complet.

## 6. RÃ¨gle pour lâ€™auto-dÃ©couverte

Lâ€™…ÕÑ¼µ“¥½ÕÙ•ÉÑ”É•ÍÑ”…ÕÑ½É¥Ï¥”•¸±•ÑÕÉ”Í•Õ±”¸()U¸“¥ÃÑĞ“¥Í½ÕÙ•ÉĞ‘½¥Ğƒ©ÑÉ”Ë§¤…Ù•Œ€è((´ÍÑ…ÑÕÌõ‘¥Í½Ù•É•‘€(´…ÕÕ¸¡•µ¥¸Í•ÉÙ•ÕÈ½¹™¥É·¤€ì(´…ÕÕ¹”…Á…¥Ó¤“Šg¥É¥ÑÕÉ”€ì(´‘•Á±½å¹…‰±•õ™…±Í•€(´‘•ÍÑÉÕÑ¥Ù•=Á•É…Ñ¥½¹Í¹…‰±•õ™…±Í•€()1”¡•µ¥¸Ñ£¥½É¥ÅÕ”€½½ÁĞ½…ÁÁÌ½İ•…±Ñ¡Ñ• µ¥Ñ¡ÕˆµÉ•Á½Ì¼ñ½İ¹•Èø¼ñÉ•Á¼ù€¹”‘½¥Ğ©…µ…¥Ìƒ¥ÑÉ”½¹Í¥“¥Ë¤½µµ”Õ¸¡•µ¥¸½Ã¥É…Ñ¥½¹¹•°Í…¹ÌÙ…±¥‘…Ñ¥½¸•áÁ±¥¥Ñ”¸((ŒŒ€Ü¸]½É­™±½Ü‘”µ¥Í”ƒ€©½ÕÈ“ŠeÕ¸µ…ÁÁ¥¹œ((ŒŒŒ€Ü¸Ä¥½ÕÙ•ÉÑ”()1”5@±¥Ğ¥Ñ!Õˆ•Ğ…©½ÕÑ”Õ¸“¥ÃÑĞµ…¹ÅÕ…¹Ğ½µµ”‘¥Í½Ù•É•‘€¸()ÕÕ¹”½Ã¥É…Ñ¥½¸Í•ÉÙ•ÕÈ»Še•ÍĞ…ÕÑ½É¥Ï¥”¸((ŒŒŒ€Ü¸ÈAÉ½Á½Í¥Ñ¥½¸()U¸ÕÑ¥±¥Í…Ñ•ÕÈ…ÕÑ¡•¹Ñ¥™§¤Ï¥±•Ñ¥½¹¹”€è((´±”“¥ÃÑĞ€ì(´±”ÁÉ½©•Ğ€ì(´±”Í•ÉÙ•ÕÈ€ì(´±”¡•µ¥¸…¹‘¥‘…Ğ€ì(´±”‘½µ…¥¹”ƒ¥Ù•¹ÑÕ•°€ì(´±„‰É…¹¡”½™™¥¥•±±”€ì(´±”¹¥Ù•…Ô“Še…¡Ì‘•µ…¹“¤¸()MÑ…ÑÕÌ€èÁÉ½Á½Í•‘€¸((ŒŒŒ€Ü¸Ì[¥É¥™¥…Ñ¥½¸()1”Í•ÉÙ•ÕÈÛ¥É¥™¥”€è((´ÅÕ”±”Í•ÉÙ•ÕÈ•ÍĞ…ÕÑ½É¥Ï¤€ì(´ÅÕ”±”¡•µ¥¸Í”ÑÉ½ÕÙ”Í½ÕÌÕ¹”É…¥¹”…ÕÑ½É¥Ï¥”€ì(´ÅÕ”É•…±Á…Ñ¡€½ÉÉ•ÍÁ½¹…Ô¡•µ¥¸“¥±…Ë¤€ì(´ÅÕ”±”É•µ½Ñ”¥Ğ½ÉÉ•ÍÁ½¹…Ô“¥ÃÑĞ“¥±…Ë¤€ì(´ÅÕ”±„‰É…¹¡”½™™¥¥•±±”•á¥ÍÑ”€ì(´ÅÕ”±”‘½µ…¥¹”½ÉÉ•ÍÁ½¹…ÔÙ¡½ÍĞ…ÑÑ•¹‘Ô€ì(´Å×Še…ÕÕ¸¡•µ¥¸ÁÉ½Ó¥Ÿ¤»Še•ÍĞ¥‰³¤€ì(´Å×Še…ÕÕ¸Í•É•Ğ»Še•ÍĞ•¹É•¥ÍÑË¤¸()MÑ…ÑÕĞ€èÁ…Ñ¡}Ù•É¥™¥•‘€¸((ŒŒŒ€Ü¸ĞY…±¥‘…Ñ¥½¸¡Õµ…¥¹”()3Še…Ñ•ÕÈÙ…±¥‘”€è((´±”ÁÉ½©•Ğ€ì(´±”“¥ÃÑĞ€ì(´±”Í•ÉÙ•ÕÈ€ì(´±”¡•µ¥¸€ì(´±”‘½µ…¥¹”€ì(´±•Ì…Á…¥Ó¥Ì€ì(´±”¹¥Ù•…Ô‘”É¥ÍÅÕ”€ì(´±„Á½±¥Ñ¥ÅÕ”‘”Í…ÕÙ•…É‘”€ì(´±„·¥Ñ¡½‘”‘”É½±±‰…¬¸()MÑ…ÑÕĞ€èÙ…±¥‘…Ñ•‘€¸((ŒŒŒ€Ü¸ÔÑ¥Ù…Ñ¥½¸()M•Õ°Õ¸µ…ÁÁ¥¹œÙ…±¥‘…Ñ•‘€Á•ÕĞ‘•Ù•¹¥È…Ñ¥Ù•€¸()3Še…Ñ¥Ù…Ñ¥½¸‘½¥ĞÁÉ½‘Õ¥É”Õ¸ƒ¥Û¥¹•µ•¹Ğ“Še…Õ‘¥Ğ…Ù•Œ€è((´‘…Ñ”€ì(´…Ñ•ÕÈ€ì(´…¹¥•¹¹”Ù…±•ÕÈ€ì(´¹½ÕÙ•±±”Ù…±•ÕÈ€ì€(´É…¥Í½¸€ì(´É¥ÍÅÕ”€ì(´Ë¥ÍÕ±Ñ…Ğ¸((ŒŒŒ€Ü¸ØMÕÍÁ•¹Í¥½¸•Ğ…É¡¥Ù…”()U¸µ…ÁÁ¥¹œÁ•ÕĞƒ©ÑÉ”€è((´ÍÕÍÁ•¹‘•‘€Í…¹Ìƒ©ÑÉ”ÍÕÁÁÉ¥·¤€ì(´…É¡¥Ù•‘€…ÁË9Ìµ¥É…Ñ¥½¸½Ô…‰…¹‘½¸€ì(´©…µ…¥ÌÍÕÁÁÉ¥·¤Á¡åÍ¥ÅÕ•µ•¹ĞÍ…¹Ì¡¥ÍÑ½É¥ÅÕ”¸((ŒŒ€à¸…Á…¥Ó¥ÌÁ…Èµ…ÁÁ¥¹œ()1•Ì…Á…¥Ó¥Ì‘½¥Ù•¹Ğƒ©ÑÉ”Ï¥Á…Ë¥•Ì€è()©Í½¸)ì(€€‰¥¹Ù•¹Ñ½ÉäˆèÑÉÕ”°(€€‰É•…‘¥±•ÌˆèÑÉÕ”°(€€‰Í•…É¡½‘”ˆèÑÉÕ”°(€€‰É•…‘1½ÌˆèÑÉÕ”°(€€‰¥ÑMÑ…ÑÕÌˆèÑÉÕ”°(€€‰İÉ¥Ñ•¥±•Ìˆè™…±Í”°(€€‰É•…Ñ•	É…¹ ˆè™…±Í”°(€€‰½µµ¥Ğˆè™…±Í”°(€€‰ÁÕÍ¡	É…¹ ˆè™…±Í”°(€€‰‰Õ¥±ˆè™…±Í”°(€€‰‘•Á±½äˆè™…±Í”°(€€‰É½±±‰…¬ˆè™…±Í”°(€€‰ÅÕ…É…¹Ñ¥¹”ˆè™…±Í”°(€€‰ÁÕÉ”ˆè™…±Í”)ô)€()K¡±•Ì€è((´±•ÑÕÉ”…Ñ¥Ù…‰±”¥¹“¥Á•¹‘…µµ•¹Ğ‘•Ì½ÕÑ¥±Ì“Šg¥É¥ÑÕÉ”€ì(´ƒ¥É¥ÑÕÉ”“¥Í…Ñ¥Û¥”Á…È“¥™…ÕĞ€ì(´ÁÕÍ ‘¥É•ĞÍÕÈµ…¥¹€¥¹Ñ•É‘¥Ğ€ì(´“¥Á±½¥•µ•¹ĞÏ¥Á…Ë¤‘”³Šg¥É¥ÑÕÉ”€ì(´ÁÕÉ”Ï¥Á…Ë¥”‘”±„ÅÕ…É…¹Ñ…¥¹”€ì(´‘•ÍÑÉÕÑ¥½¸“¥Í…Ñ¥Û¥”±½‰…±•µ•¹ĞÁ…È“¥™…ÕĞ¸((ŒŒ€ä¸É½¹Ñ•¹¥‰±”()1”™É½¹Ñ•¹‘½¥ĞŸ¥É•È€è((Ä¸½µÁÑ•Ì¥Ñ!Õˆ€ì(È¸“¥ÃÑÑÌ“µ½ÕÙ•ÉÑÌ€ì+£2âÖ–æw2&÷÷<:—2°£BâÖ–æw27F–g2°£Râ66—L:—2°£bâÖ–w&F–öç2FRFöÖ–æW2°£râ¦÷W&æÂN(	–VF—B°£‚â:—FBGR6W'fWW"Ô5°£’â:—FBFRÎ(	–Fç26†DuB°£â:—FBFRÆ6öææW†–öâv—D‡V"à ¤7F–öç2WF÷&—<:–W2  ¢Ò&÷÷6W"°¢Òl:—&–f–W"°¢ÒfÆ–FW"°¢Ò7F—fW"°¢ÒÖöF–f–W"°¢Ò7W7VæG&R°¢Ò,:–7F—fW"°¢Ò&6†—fW"à ¤V7VæR7F—fF–öâFR66—L:’6Vç6–&ÆRæRFö—B:§G&R–×Æ–6—FRà ¢22âÖ—6R:¦÷W"FW2Föæì:–W26ç2&V'V–Æ@ ¥VæRÖöF–f–6F–öâW&VÖVçBFö7VÖVçF—&R÷RFR&Vv—7G&RWWB:§G&R:–7&—FRFç2âöFF,:‡2  £â6WfVv&FRGRf–6†–W"6÷W&çB°£"âfÆ–FF–öâ¥4ôâ°£2âfÆ–FF–öâGR66Œ:–Ö°£Bâ6ö×&—6öâGRF–fb°£Râ'6Væ6RFR6V7&WB°£bâ¦÷WBN(	—Vâ:—l:–æVÖVçBN(	–VF—B°£râ:–7&—GW&RFöÖ—VR°£‚â&VÆV7GW&R°£’âl:—&–f–6F–öâföæ7F–öææVÆÆRà ¤Ü:¦ÖR6’V7Vâ&V'V–ÆBî(	–W7Bì:–6W76—&RÂVæRÖöF–f–6F–öâFRÖ–ær÷:—&F–öææVÂ&W7FRVæR÷:—&F–öâN(	œ:–7&—GW&R6Vç6–&ÆRWB&WV–W'BVæRWF÷&—6F–öâW‡Æ–6—FRà ¢22âÖ—6R:¦÷W"GR6öFP ¤ÆW26†ævVÖVçG2FR6öFRFö—fVçB7V—g&R  £â'&æ6†R&÷&R7,:œ:–RFWV—2Æ&6VÆ–æRfÆ–L:–R°£"âÖöF–f–6F–öâÆ–Ö—L:–R°£2âFW7G2°£BâG—V6†V6²°£Râ'V–ÆB°£bâ66â6V7&WG2°£râ6öÖÖ—B°£‚âW6‚7W"'&æ6†RÖ7ò¦°£’â"G&gB°£â&WgVR°£âÖW&vR°£"â6öç7G'V7F–öâN(	—VæR–ÖvRfV24„v—B°£2âFW7B—6öÌ:’°£BâL:—Æö–VÖVçBWF÷&—<:’°£Râl:—&–f–6F–öâ°£bâFö7VÖVçFF–öâGRö–çBFR&W&—6Rà ¢22"âÆ–væVÖVçBv—D‡V"ò3ò'VçF–ÖP ¤Î(	–Æ–væVÖVçBî(	™\İÛÛ™š\›pêH]YHÚH‚‚‹HÚ]XˆÚ[Hİ\ˆHÛÛ[Z]][™HÂ‹HÌH\İİ\ˆHœ˜[˜ÚHÙ™šXÚY[HÂ‹HHÛÜšÚ[™È™YH\İ›Ü™HÂ‹H8 &Z[XYÙHØÚÙ\ˆ\İÛÛœİZ]H\Z\ÈÙHÛÛ[Z]Â‹H8 &Z[XYÙH^ÜÙHÛÛˆÒH]ÛÛˆYÙ\İÂ‹HHØ][ÙİYH\Èİ][ÈÛÜœ™\ÜÛ™Â‹H\È[™Ú[ÈÛÛ˜[Y0ê\ÈÂ‹HHØİ[Y[][ÛˆH›ÙXİ[Ûˆ\İZ\ÙH0è›İ\‹‚‚•[ˆÒHY[\]YH[™HÚ]Xˆ]Ú]İ]\Ø™HİY™š]\ÈÚH8 &Z[XYÙHH0ê]0êHÛÛœİZ]H\Z\È[ˆÛÜšÚ[™È™YHØ[K‚‚ˆÈÈLËˆ°êÛ\ÈHğêXİ\š]0êH\›X[™[\Â‚‹H]Xİ[ˆÙXÜ™][œÈÚ]Â‹H]Xİ[ˆ0ê\0í0êXÛİ]™\]]ÛX]\]Y[Y[Xİ]°êHÂ‹H]Xİ[ˆÚ[Z[ˆ[™[0êHÛÛœÚY0ê\°êHÛÛ[YH°ê\šYšpêHÂ‹H]Xİ[™H0êXÜš]\™HÜœÈX\[™ÈXİYˆÂ‹H]Xİ[™HØ\XÚ]0êH\İXİ]™HØ[œÈX[šY™\İHÂ‹H]Xİ[™Hİ\™\ÜÚ[ÛˆH˜XÚ[™H\ÚÈÂ‹H]Xİ[™Hİ\™\ÜÚ[ÛˆH0ê\0íÚ]Xˆ[™[[™HZYÜ˜][ÛˆÂ‹H]Xİ[™H\™ÙH]˜[Ø]]™YØ\™H]˜[Y][ÛˆH™[\XÙ[Y[Â‹H]Xİ[ˆ\Ú\™Xİİ\ˆXZ[˜Â‹H]Xİ[ˆ™]ŞXYÙH8 &][ˆÛÜšÚ[™È™YHØ[H]˜[Û˜\Úİ‚‚ˆÈÈMˆ›ØÚZ[™\È[\0ê[Y[][ÛœÂ‚ŒKˆØÚ0ê[XHÚ]™YÚ\İHŒ˜ÂŒ‹ˆZYÜ˜][ÛˆŒH8¡¤ˆŒˆ›Ûˆ\İXİ]™HÂŒËˆÔ•Qœ›Û[™ğêXİ\š\ğêHÂˆ°ê\šYšXØ][ÛˆHÚ[Z[ˆ]™[[İHÂKˆØ\XÚ]0ê\È\ˆX\[™ÈÂ‹ˆ]Y][[]XX›HÂËˆÛÛ[Z]0êH\ÈÛÛ\\È[œÈ\È›İ]™[\ÈÛÛ™\œØ][ÛœÈÂˆÙ\İ[Ûˆ\ÈZYÜ˜][ÛœÈHÛXZ[™\ÈÂKˆğê\\˜][Ûˆ™XYÈÜš]HÈ\ŞHÈ\İXİ]™HÂŒLˆ\İÈH›Û‹\°êYÜ™\ÜÚ[Û‹‚‚ˆÈÈMKˆ0â]]]H[ÛY[HH°êYXİ[Û‚‚‹HPÔÛÛ›™Xİ0êHˆİZHÂ‹H[[YH[ÙYšpêH\ˆÙ]]Y]ˆ›ÛˆÂ‹HZ[ˆ›ÛˆÂ‹H™\İ\ˆ›ÛˆÂ‹H0ê\ÚY[Y[ˆ›ÛˆÂ‹Hİ\™\ÜÚ[Ûˆˆ›ÛˆÂ‹H\™ÙHˆ›ÛˆÂ‹HØİ[Y[][ÛˆØØ[HˆİZHÂ‹HÛÛ[Z]Ú]ˆ›ÛˆÂ‹H\ÚÚ]Xˆˆ›Û‹‚