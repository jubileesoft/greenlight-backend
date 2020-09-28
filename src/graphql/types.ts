export enum Collection {
  users = 'users',
  tenants = 'tenants',
  appusers = 'appusers',
  apps = 'apps',
  privileges = 'priovileges',
  privilegepools = 'privilegepools',
}

export enum UserRoleType {
  ADMIN = 'ADMIN',
  TENANT_ADMIN = 'TENANT_ADMIN',
  APP_ADMIN = 'APP_ADMIN',
}

export interface UserRole {
  type: UserRoleType;
  ids?: string[];
}

export interface User {
  id: string;
  email: string;
  roles: UserRole[];
}

export interface Tenant {
  id: string;
  name: string;
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
