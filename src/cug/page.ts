export function renderCugAdmission(nonce: string): string {
  return `<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Requête gouvernée · CUG</title>
<style nonce="${nonce}">
:root{color-scheme:light;--ink:#15233d;--muted:#52647e;--line:#d9e2ef;--accent:#2358bb;--focus:#f3b746}
*{box-sizing:border-box}body{margin:0;min-height:100vh;background:radial-gradient(ellipse at 8% 0%,#dce9ff 0%,transparent 48%),linear-gradient(145deg,#f7faff,#edf2f9);color:var(--ink);font:16px/1.55 system-ui,-apple-system,Segoe UI,sans-serif}
main{max-width:42rem;margin:clamp(1rem,7vh,5rem) auto;padding:clamp(1.25rem,4vw,2.75rem);background:#fff;border:1px solid var(--line);border-radius:1.4rem;box-shadow:0 18px 60px #142e5720}
form:not([hidden]){margin:1.25rem 0 0;padding:clamp(1rem,3vw,1.5rem);border:1px solid var(--line);border-radius:.9rem;background:#f7faff}form label:first-child,form h2:first-child{margin-top:0}
h1{font-size:clamp(1.9rem,4vw,2.6rem);letter-spacing:-.045em;line-height:1.15;margin:.55rem 0 1.3rem}h2{font-size:1.3rem;letter-spacing:-.025em;margin-top:1.7rem}section{border-top:1px solid var(--line);margin-top:1.5rem;padding-top:.3rem}
label{display:block;margin:1rem 0 .4rem;font-weight:650}input,select,textarea,button{font:inherit;box-sizing:border-box;padding:.8rem .9rem;width:100%;border-radius:.65rem;border:1px solid #9eafc7;background:#fff;color:var(--ink)}
input:hover,select:hover,textarea:hover{border-color:#567ab2}input:focus-visible,select:focus-visible,textarea:focus-visible,button:focus-visible,a:focus-visible{outline:3px solid var(--focus);outline-offset:3px}
button{background:var(--accent);border-color:var(--accent);color:#fff;cursor:pointer;font-weight:700;margin-top:1rem;min-height:3rem;transition:background-color .15s ease,transform .15s ease}button:hover:not(:disabled){background:#17438e}button:active:not(:disabled){transform:translateY(1px)}button:disabled{opacity:.6;cursor:wait}
input[type=checkbox]{width:auto;accent-color:var(--accent);margin-right:.5rem}label:has(input[type=checkbox]){font-weight:500;display:flex;align-items:baseline}small{color:var(--muted);font-weight:600;letter-spacing:.035em}code{overflow-wrap:anywhere;background:#f1f5fb;padding:.1rem .25rem;border-radius:.25rem}#result:not(:empty),#checkpointResult:not(:empty){border-left:3px solid var(--accent);background:#eff5ff;padding:.8rem 1rem;border-radius:.25rem .6rem .6rem .25rem}[hidden]{display:none!important}
@media(max-width:44rem){main{margin:1rem;padding:1.3rem;border-radius:1rem}}@media(prefers-reduced-motion:reduce){button{transition:none}}
</style>
<main><small>CUG / ENTRÉE OAUTH</small><h1>Requête gouvernée</h1>
<p>Vérifiez le contexte qui a émis le lien, puis choisissez votre compte. La session du tableau de bord est distincte.</p>
<form id="auth" autocomplete="off">
<label for="app">App ID GitHub</label><input id="app" required inputmode="numeric" pattern="[0-9]{1,20}">
<label for="bearer">Bearer token MCP</label><input id="bearer" type="password" autocomplete="off" required>
<button>Vérifier la connexion</button></form>
<form id="selection" hidden><label for="account">Compte GitHub</label><select id="account" required></select><button>Choisir ce compte</button></form>
<p id="result" role="status" aria-live="polite"></p>
<section id="identity" hidden><h2>Ton point d’entrée</h2><p>Identité canonique <code id="identityId"></code></p><p>Racine de continuité <code id="continuityRootId"></code></p><p>Aucun travail de code n’a été ouvert.</p></section>
<form id="questionnaire" hidden>
<h2>Demande de création de dépôt</h2>
<p>Compte vérifié <strong id="selectedAccount"></strong></p>
<label for="repo">Nom du dépôt</label><input id="repo" required maxlength="100" pattern="[A-Za-z0-9_.\\-]{1,100}">
<label for="visibility">Visibilité du dépôt cible</label>
<select id="visibility" required><option value="">Choisir</option><option value="private">Privé</option><option value="public">Public</option></select>
<label for="objective">Objectif public de la demande</label>
<textarea id="objective" rows="3" maxlength="800" required></textarea>
<p><small>La demande est enregistrée dans le dépôt public GRT, même si le dépôt cible est privé. Ne saisis aucun secret ni information confidentielle.</small></p>
<label><input type="checkbox" id="publish" required> Je confirme la publication de ces informations dans GRT.</label>
<label><input type="checkbox" id="create" required> Je demande à GRT de préparer et, si ses contrôles passent, de créer ce dépôt.</label>
<button>Soumettre la demande</button>
</form>
<section id="checkpoint" hidden><h2>Suivi de la demande</h2>
<button type="button" id="observe">Vérifier le dossier GRT</button>
<p id="checkpointResult" role="status" aria-live="polite"></p>
</section>
</main>
<script nonce="${nonce}">
const q=id=>document.getElementById(id)
const request=new URLSearchParams(location.hash.slice(1)).get('request')
history.replaceState(null,'',location.pathname)
let bearer='',appId='',formRef=''
function show(value){q('result').textContent=value}
window.addEventListener('pagehide',()=>{bearer=''})
async function send(action, body){
  const res=await fetch('/repo-template/auth/'+action,{method:'POST',credentials:action==='select'?'same-origin':'omit',cache:'no-store',referrerPolicy:'no-referrer',
    headers:{'Content-Type':'application/json',Authorization:'Bearer '+bearer},body:JSON.stringify({...body,appId,request})})
  if(!res.ok)throw Error('REFUSED')
  return res.json()
}
q('auth').addEventListener('submit',async event=>{
  event.preventDefault()
  const button=event.target.querySelector('button')
  if(button.disabled)return
  button.disabled=true
  appId=q('app').value.trim()
  bearer=q('bearer').value.trim()
  q('bearer').value=''
  try{
    const result=await send('verify',{})
    q('account').replaceChildren(...result.accounts.map(x=>new Option(x.login,x.login)))
    q('auth').hidden=true
    q('selection').hidden=result.accounts.length===0
    if(!result.accounts.length)bearer=''
    show(result.accounts.length?'Choisis un compte autorisé.':'Aucun compte autorisé.')
  }catch{bearer='';show('Connexion refusée ou indisponible. Vérifie les informations ou relance la demande.')}
  finally{button.disabled=false}
})
q('selection').addEventListener('submit',async event=>{
  event.preventDefault()
  const button=event.target.querySelector('button')
  if(button.disabled)return
  button.disabled=true
  try{
    const result=await send('select',{accountId:q('account').value})
    formRef=result.formRef
    q('identityId').textContent=result.identityId
    q('continuityRootId').textContent=result.continuityRootId
    q('identity').hidden=false
    q('selectedAccount').textContent=q('account').value
    q('questionnaire').hidden=result.mode==='RESUME'
    q('checkpoint').hidden=result.mode!=='RESUME'
    show('')
  }catch{show('Compte non autorisé ou demande expirée. Relance la demande depuis le MCP.')}
  finally{bearer='';q('selection').hidden=true}
})
q('questionnaire').addEventListener('submit',async event=>{
  event.preventDefault()
  const button=event.target.querySelector('button')
  if(button.disabled)return
  button.disabled=true
  try{
    const res=await fetch('/repo-template/auth/submit',{method:'POST',credentials:'same-origin',cache:'no-store',
      headers:{'Content-Type':'application/json','X-CUG-Form':formRef},body:JSON.stringify({
        objective:q('objective').value.trim(),repositoryName:q('repo').value.trim(),
        visibility:q('visibility').value,publishToControlPlane:q('publish').checked,
        confirmCreateRepository:q('create').checked
      })})
    const result=await res.json()
    if(result.status==='QUEUED'||result.status==='DELIVERY_UNKNOWN'||result.status==='RECONCILIATION_REQUIRED'){
      q('questionnaire').hidden=true
      q('checkpoint').hidden=false
      show(result.status==='QUEUED'
        ? 'Transmise à GitHub. La demande GRT et sa préparation restent à vérifier.'
        : 'Réception à vérifier. Ne soumets pas une seconde demande.')
    }else if(result.status==='AUTHORIZATION_REQUIRED'){
      show('Admission expirée ou accès retiré. Relance la connexion.')
    }else if(result.status==='INVALID_REQUEST'){
      show('Vérifie le nom et l’objectif public. Les mentions et les balises ne sont pas autorisées.')
    }else if(result.status==='ALREADY_SUBMITTED'){
      q('checkpoint').hidden=false
      show('Soumission en cours ou déjà reçue. Vérifie le dossier.')
    }else show('Soumission indisponible ou non autorisée pour ce compte et ce dépôt.')
  }catch{q('questionnaire').hidden=true;q('checkpoint').hidden=false;show('Réception inconnue. Vérifie le dossier avant toute nouvelle demande.')}
  finally{button.disabled=false}
})
q('observe').addEventListener('click',async()=>{
  const button=q('observe')
  if(button.disabled)return
  button.disabled=true
  const result=q('checkpointResult')
  try{
    const res=await fetch('/repo-template/auth/status',{credentials:'same-origin',cache:'no-store',headers:{'X-CUG-Form':formRef}})
    const state=await res.json()
    result.replaceChildren()
    if(state.status!=='FOUND'){
      result.textContent=state.status==='AUTHORIZATION_REQUIRED'?'Admission expirée. Reconnecte-toi.':'Dossier non confirmé. Cela ne prouve pas son absence.'
      return
    }
    result.textContent=state.projectContinuityId+' · '+state.phase+' · '
    const a=document.createElement('a')
    a.href=state.issueUrl
    a.textContent='Voir le dossier GitHub'
    a.rel='noreferrer'
    result.append(a)
  }catch{result.textContent='Le suivi est indisponible. Aucun renvoi automatique.'}
  finally{button.disabled=false}
})
</script></html>`
}
