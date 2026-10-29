/**
 * GD-U-02D B3j — reuse the CURRENT GitRegistry before proposing a new Plesk
 * target. No new registry, no second orchestrator, no mutation.
 * A missing mapping in a VALID registry triggers DISCOVERY, not permission to
 * create a domain: a physical-hosting absence probe must still be performed.
 */
import type { GitRegistryProjectEvidence } from '../github/registry.js';

export type RepositoryPleskHostingRoute=Readonly<{
 status:'REUSE_VERIFIED_SERVER_BINDING'|'NEEDS_PLESK_DISCOVERY'|'BLOCKED';
 reason:'EXISTING_SERVER_BINDING_VERIFIED'|'REPOSITORY_MAPPING_ABSENT'
  |'REGISTRY_NOT_ATTESTED'|'REPOSITORY_INVALID'|'AMBIGUOUS_REPOSITORY_MAPPING'
  |'EXISTING_BINDING_UNVERIFIED';
 mappingId:string|null;
 serverId:string|null;
 serverPath:string|null;
 mutationAuthorized:false;
 operationExecuted:false;
}>;
const REPO=/^github:[a-z0-9][a-z0-9-]{0,38}\/[a-z0-9._-]{1,100}$/i;
const blocked=(reason:RepositoryPleskHostingRoute['reason']):RepositoryPleskHostingRoute=>({
 status:'BLOCKED',reason,mappingId:null,serverId:null,serverPath:null,
 mutationAuthorized:false,operationExecuted:false
});
export function resolveRepositoryPleskHostingRoute(
  repositoryId:string,registry:GitRegistryProjectEvidence|null
):RepositoryPleskHostingRoute{
 if(typeof repositoryId!=='string'||!REPO.test(repositoryId))return blocked('REPOSITORY_INVALID');
 if(!registry||registry.available!==true||registry.sourceSchemaVersion!==2
   ||!Array.isArray(registry.mappings)||!Array.isArray(registry.activationReadiness)
   ||!Array.isArray(registry.serverBindings))return blocked('REGISTRY_NOT_ATTESTED');
 const target=repositoryId.toLowerCase();
 const mappings=registry.mappings.filter(m=>m.repositoryId.toLowerCase()===target);
 if(mappings.length===0)return {
   status:'NEEDS_PLESK_DISCOVERY',reason:'REPOSITORY_MAPPING_ABSENT',
   mappingId:null,serverId:null,serverPath:null,
   mutationAuthorized:false,operationExecuted:false
 };
 if(mappings.length!==1)return blocked('AMBIGUOUS_REPOSITORY_MAPPING');
 const mapping=mappings[0]!;
 const bindings=registry.serverBindings.filter(b=>b.mappingId===mapping.mappingId
   &&b.repositoryId.toLowerCase()===target
   &&b.environment==='production');
 const readiness=registry.activationReadiness.filter(r=>r.mappingId===mapping.mappingId);
 if(bindings.length!==1||readiness.length!==1||readiness[0]?.status!=='READY')
   return blocked('EXISTING_BINDING_UNVERIFIED');
 const b=bindings[0]!;
 if(!b.realPathVerified||!b.realPath||!b.realPath.startsWith('/')
   ||!b.serverPath.startsWith('/')
   ||(b.serverId!=='s1'&&b.serverId!=='s2'))
   return blocked('EXISTING_BINDING_UNVERIFIED');
 return {
   status:'REUSE_VERIFIED_SERVER_BINDING',
   reason:'EXISTING_SERVER_BINDING_VERIFIED',
   mappingId:mapping.mappingId,serverId:b.serverId,serverPath:b.serverPath,
   mutationAuthorized:false,operationExecuted:false
 };
}
