type Repository = Readonly<{id:string;name:string;branch:string}>;
type Observation = Readonly<{state:unknown; evidence:{repository:string;issue:number;observedAt:string}}>;
type LocalObservation = Readonly<{
  state:unknown; baselineReceipt?:unknown;
  evidence:{repository:string;repositoryId:string;issue:number;observedAt:string};
}>;
type Ports = Readonly<{
  authorize:(input:{projectId:string;principalRef:string})=>Promise<{projectId:string;centralIssue:number}|null>;
  readCentral:(input:{projectId:string;issue:number})=>Promise<Observation|null>;
  readLocal:(input:{projectId:string;repository:Repository;centralIssue:number})=>Promise<LocalObservation|null>;
}>;
export function resumeRepositoryCreation(input:{projectId:string;principalRef:string},ports:Ports):
  Promise<{status:'UNAVAILABLE'|'BLOCKED'|'HELD'|'READY'|'WAITING_LOCAL'|'HANDOFF';[key:string]:unknown}>;
