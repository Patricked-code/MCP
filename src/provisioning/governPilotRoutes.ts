import express from 'express';
import type { Request, RequestHandler, Router } from 'express';
import type { PilotStage } from './governPilot.js';
export type GovernPilotWebDeps = {
  requireLogin: RequestHandler;
  session: (req: Request) => string;
  sameOrigin: (req: Request) => boolean;
  issueTicket: (purpose:string,binding:string)=>string;
  verifyTicket: (purpose:string,ticket:unknown,binding:string)=>boolean;
  enabled:()=>boolean;
  writeEnabled:()=>boolean;
  read:()=>Promise<{revision:string;sha256:string;bytes:number}|null>;
  stage:()=>Promise<PilotStage>;
};
export function createGovernPilotRouter(_deps:GovernPilotWebDeps):Router{return express.Router()}
