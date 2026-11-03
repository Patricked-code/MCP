/**
 * E2 G2: discover documented canonical chantier roots from the existing
 * GitHub issue bodies, issue comments and append-only E2 journal.
 *
 * This is a read-only derived view. It never creates a second registry,
 * authority, Task, Session, Claim, Lock or permission. An incomplete scan is
 * PARTIAL (and cannot admit G3), never a falsely exhaustive READY.
 */
import {loadE2Journal,type E2JournalPort} from './e2EntryJournal.js';

const REPO='/repos/Patricked-code/MCP';
const ROOT=/^[A-Z][A-Z0-9-]{5,110}$/;
const ISSUE_URL=/^https:\/\/api\.github\.com\/repos\/Patricked-code\/MCP\/issues\/([1-9][0-9]*)$/;
const OWNER_ASSOCIATIONS=new Set(['OWNER','MEMBER','COLLABORATOR']);
const PAGE_SIZE=100;
const MAX_PAGES=100;

export type E2CanonicalRoot=Readonly<{
  continuityId:string;
  issueNumber:number;
  source:'E2_GITHUB_JOURNAL'|'HISTORICAL_GITHUB_ISSUE'|'HISTORICAL_GITHUB_COMMENT';
}>;
export type E2CanonicalDiscoveryResult=Readonly<{
  status:'READY'|'PARTIAL'|'CONFLICT'|'BLOCKED';
  continuities:readonly E2CanonicalRoot[];
  reason:string|null;
  grantsPermission:false;
}>;
type RecordLike=Record<string,unknown>;
const object=(value:unknown):RecordLike|null=>
  value!==null&&typeof value==='object'&&!Array.isArray(value)
    ?value as RecordLike:null;
const issueNumber=(value:unknown):number|null=>
  Number.isSafeInteger(value)&&Number(value)>0?Number(value):null;

/** Only an explicit root declaration counts; incidental IDs do not. */
export function extractE2CanonicalIssueRoot(body:string):string|null{
  const rx=/\*\*Continuity ID(?: canonique| racine)?\s*:\*\*\s*`([A-Z][A-Z0-9-]{5,110})`/gi;
  const matches=[...body.matchAll(rx)].map(m=>m[1]!).filter(id=>ROOT.test(id));
  const unique=[...new Set(matches)];
  return unique.length===1?unique[0]!:null;
}
export function extractE2CanonicalCommentRoot(body:string):string|null{
  // "Identifiant retenu" is the recorded adoption decision in #349.
  // A proposed index or a reference to a child continuity is NOT an adoption.
  if(!/racine unique adopt[ée]e?|racine documentaire adopt[ée]e?/i.test(body))
    return null;
  const matches=[...body.matchAll(/\*\*Identifiant retenu\s*:\s*`([A-Z][A-Z0-9-]{5,110})`/gi)]
    .map(m=>m[1]!).filter(id=>ROOT.test(id));
  const unique=[...new Set(matches)];
  return unique.length===1?unique[0]!:null;
}

export async function discoverE2CanonicalRoots(
  port:E2JournalPort,
  maxPages:number=MAX_PAGES
):Promise<E2CanonicalDiscoveryResult>{
  const entries=new Map<string,E2CanonicalRoot>();
  const byIssue=new Map<number,string>();
  const issues=new Map<number,RecordLike>();
  let failure:string|null=null;
  const fail=(status:'PARTIAL'|'CONFLICT'|'BLOCKED',reason:string):E2CanonicalDiscoveryResult=>({
    status,reason,continuities:[...entries.values()].sort((a,b)=>a.continuityId.localeCompare(b.continuityId)),
    grantsPermission:false
  });
  const add=(root:E2CanonicalRoot):boolean=>{
    const previous=entries.get(root.continuityId);
    const previousRoot=byIssue.get(root.issueNumber);
    if((previous&&previous.issueNumber!==root.issueNumber)
       ||(previousRoot&&previousRoot!==root.continuityId)){
      failure='E2_CANONICAL_ROOT_CONFLICT';
      return false;
    }
    // The append-only journal remains primary when both sources agree.
    if(!previous||root.source==='E2_GITHUB_JOURNAL'){
      entries.set(root.continuityId,root);
    }
    byIssue.set(root.issueNumber,root.continuityId);
    return true;
  };
  const journal=await loadE2Journal(port);
  if(journal.status!=='READY')return fail('BLOCKED','E2_GITHUB_JOURNAL_NOT_VERIFIED');
  for(const event of journal.entries){
    if(event.stage==='CONTINUITY_REGISTERED'&&event.continuityId&&event.issueNumber){
      if(!add({continuityId:event.continuityId,issueNumber:event.issueNumber,
        source:'E2_GITHUB_JOURNAL'}))return fail('CONFLICT',failure!);
    }
  }
  if(!Number.isSafeInteger(maxPages)||maxPages<1||maxPages>MAX_PAGES)
    return fail('BLOCKED','E2_DISCOVERY_PAGE_BUDGET_INVALID');

  // GitHub REST issue listing includes PRs. They must not become chantiers.
  let issuesComplete=false;
  for(let page=1;page<=maxPages;page++){
    const response=await port.request(REPO+'/issues?state=all&per_page='+PAGE_SIZE+'&page='+page);
    if(!response.ok||!Array.isArray(response.json))
      return fail('PARTIAL','E2_ISSUE_SCAN_INCOMPLETE');
    for(const raw of response.json){
      const issue=object(raw),n=issueNumber(issue?.number);
      if(!n||issue?.pull_request)continue;
      issues.set(n,issue!);
      const id=typeof issue?.body==='string'?extractE2CanonicalIssueRoot(issue.body):null;
      if(id&&!add({continuityId:id,issueNumber:n,source:'HISTORICAL_GITHUB_ISSUE'}))
        return fail('CONFLICT',failure!);
    }
    if(response.json.length<PAGE_SIZE){issuesComplete=true;break;}
  }
  if(!issuesComplete)return fail('PARTIAL','E2_ISSUE_PAGE_LIMIT');

  // Repo-wide issue-comment feed discovers canonical declarations in comments,
  // including GD-U #349, without hardcoding an issue number or a root ID.
  let commentsComplete=false;
  for(let page=1;page<=maxPages;page++){
    const response=await port.request(REPO+'/issues/comments?per_page='+PAGE_SIZE+'&page='+page);
    if(!response.ok||!Array.isArray(response.json))
      return fail('PARTIAL','E2_COMMENT_SCAN_INCOMPLETE');
    for(const raw of response.json){
      const comment=object(raw);
      if(typeof comment?.body!=='string'
         ||!OWNER_ASSOCIATIONS.has(String(comment.author_association)))continue;
      const id=extractE2CanonicalCommentRoot(comment.body);
      if(!id)continue;
      const url=typeof comment.issue_url==='string'?ISSUE_URL.exec(comment.issue_url):null;
      const n=url?Number(url[1]):null;
      if(!n||!issues.has(n))return fail('PARTIAL','E2_COMMENT_PARENT_ISSUE_NOT_VERIFIED');
      if(!add({continuityId:id,issueNumber:n,source:'HISTORICAL_GITHUB_COMMENT'}))
        return fail('CONFLICT',failure!);
    }
    if(response.json.length<PAGE_SIZE){commentsComplete=true;break;}
  }
  if(!commentsComplete)return fail('PARTIAL','E2_COMMENT_PAGE_LIMIT');
  // A registered journal entry may predate the REST issue scan. Validate its
  // issue exists and is not a pull request, otherwise fail closed.
  for(const root of entries.values()){
    if(!issues.has(root.issueNumber))
      return fail('PARTIAL','E2_JOURNAL_PARENT_ISSUE_NOT_VERIFIED');
  }
  return {status:'READY',reason:null,
    continuities:[...entries.values()].sort((a,b)=>a.continuityId.localeCompare(b.continuityId)),
    grantsPermission:false};
}
