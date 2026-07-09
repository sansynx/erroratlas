export interface Env {
  APP_NAME?: string;
  APP_ORIGIN?: string;
  PUBLIC_SUPABASE_URL?: string;
  PUBLIC_SUPABASE_ANON_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  FIELD_ENCRYPTION_KEY?: string;
}

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
  verification?: string;
  language?: string;
  framework?: string;
  packageManager?: string;
  visibility?: "private" | "team" | "public";
  risk?: "low" | "medium" | "high";
  confidence?: "low" | "medium" | "high";
  projectId?: string;
}
