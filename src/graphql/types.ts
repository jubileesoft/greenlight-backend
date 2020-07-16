export enum Collection {
  appusers,
  apps,
  privileges,
  privilegepools,
}

export interface AppUser {
  id: string;
  app?: App;
  offId: string;
  email: string;
  tags?: string[];
}

export interface AddAppUserInput {
  offId: string;
  email: string;
  tags?: string[];
}

export interface App {
  id: string;
  name: string;
  owner: string;
  apiKey1CreatedAt: Date | null;
}

export interface AddAppInput {
  name: string;
  owner: string;
}

export interface Privilege {
  id: string;
  app?: App;
  name: string;
  order: string;
  short?: string;
  tags?: string[];
}

export interface AddPrivilegeInput {
  name: string;
  short?: string;
  tags: string[];
}

export interface UpdatePrivilegeInput {
  short?: string;
  name?: string;
  tags?: string[];
}

export interface PrivilegePool {
  id: string;
  app?: App;
  name: string;
  order: string;
  short?: string;
  tags?: string[];
  privileges?: Privilege[];
}

export interface AddPrivilegePoolInput {
  name: string;
  short?: string;
  tags?: string[];
  privilegeIds: string[];
}
