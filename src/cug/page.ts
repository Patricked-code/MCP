export function renderCugAdmission(nonce: string): string {
  return `<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Requête gouvernée · CUG</title>
<style nonce="${nonce}">
body{margin:0;background:#f1f5f9;color:#162438;font:16px system-ui,sans-serif}main{max-width:35rem;margin:8vh auto;padding:1.8rem;background:white;border-radius:1rem;box-shadow:0 5px 22px #16243816}
@media(max-width:44rem){main{margin:1rem}}h1{line-height:1.15}label{display:block;margin:1rem 0 .35rem;font-weight:650}
input,select,button{font:inherit;box-sizing:border-box;padding:.65rem .8rem;width:100%;border-radius:.45rem;border:1px solid #64748b}
button{background:#153968;color:white;cursor:pointer;margin-top:1rem}button:disabled{opacity:.65}small{color:#475569}code{overflow-wrap:anywhere}[hidden]{display:none!important}
</style>
<main><small>CUG / ENTRÉE AUTHENTIFIÉE</small><h1>Requête gouvernée</h1>
<form id="auth" autocomplete="off">
<label for="app">App ID GitHub</label><input id="app" required inputmode="numeric" pattern="[0-9]{1,20}">
<label for="bearer">Bearer token MCP</label><input id="bearer" type="password" autocomplete="off" required>
<button>Vérifier la connexion</button></form>
<form id="selection" hidden><label for="account">Compte GitHub</label><select id="account" required></select><button>Choisir ce compte</button></form>
<p id="result" role="status" aria-live="polite"></p>
<section id="identity" hidden><h2>Ton point d’entrée</h2><p>Identité canonique <code id="identityId"></code></p><p>Racine de continuité <code id="continuityRootId"></code></p><p>Aucun travail n’a été ouvert.</p></section>
</main>
<script nonce="${nonce}">
const q=id=>document.getElementById(id)
const request=new URLSearchParams(location.hash.slice(1)).get('request')
history.replaceState(null,'',location.pathname)
let bearer='',appId=''
function show(value){q('result').textContent=value}
window.addEventListener('pagehide',()=>{bearer=''})
async function send(action, body){
  const res=await fetch('/repo-template/auth/'+action,{method:'POST',credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer',
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
    q('identityId').textContent=result.identityId
    q('continuityRootId').textContent=result.continuityRootId
    q('identity').hidden=false
    show('')
  }catch{show('Compte non autorisé ou demande expirée. Relance la demande depuis le MCP.')}
  finally{bearer='';q('selection').hidden=true}
})
</script></html>`
}
