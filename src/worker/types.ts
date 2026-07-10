export interface Env extends Cloudflare.Env {}

export interface HumanActor {
  kind: "human";
  userId: string;
  email?: string;
  username: string;
  displayName?: string;
  orgId: string;
  role: string;
}

export interface AgentActor {
  kind: "agent";
  keyId: string;
  orgId: string;
  projectId?: string;
  scopes: string[];
}

export type Actor = HumanActor | AgentActor;

export interface SearchPayload {
  query?: string;
  error?: string;
  stack?: string;
  language?: string;
  framework?: string;
  packageManager?: string;
  limit?: number;
}

export interface ResolutionPayload {
  error: string;
  rootCause: string;
  finalFix: string;
  failedAttempts?: string[];
  verification: string;
  language?: string;
  framework?: string;
  packageManager?: string;
  visibility?: "private" | "team" | "public";
  risk?: "low" | "medium" | "high";
  confidence?: "low" | "medium" | "high";
  projectId?: string;
}
