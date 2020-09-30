import { JFilter } from 'src/index.dt';
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Collection,
  App,
  AppUser,
  AddAppUserInput,
  AddAppInput,
  AddPrivilegeInput,
  Privilege,
  PrivilegePool,
  AddPrivilegePoolInput,
  UpdatePrivilegeInput,
  User,
  Tenant,
  AddTenantInput,
} from '../graphql/types';

export default interface Storage {
  getMe(email: string): Promise<User | null>;
  createAdminUsers(): Promise<void>;
  addTenant(input: AddTenantInput): Promise<any>;

  getDocuments(collection: Collection, filter?: JFilter): Promise<any[]>;
  deleteDocument(collection: Collection, id: string): Promise<boolean>;
  getDocument(collection: Collection, filter: any): Promise<any | null>;
  getPrivileges(appId?: string): Promise<any[] | null>;
  getAppUsers(appId: string): Promise<any[] | null>;
  getAppFromAppUser(appUserId: string): Promise<any | null>;
  getAppFromPrivilege(privilegeId: string): Promise<any | null>;
  getPrivilegePools(appId: string): Promise<any[] | null>;
  getAppFromPrivilegePool(privilegePoolId: string): Promise<any | null>;
  getPrivilegesFromPrivilegePool(privilegePoolId: string): Promise<any[] | null>;

  addAppUser(appId: string, input: AddAppUserInput): Promise<any | null>;
  addApp(input: AddAppInput): Promise<any | null>;
  createAppApiKey1(appId: string): Promise<string | null>;
  addPrivilege(appId: string, input: AddPrivilegeInput): Promise<any | null>;
  updatePrivilege(privilegeId: string, input: UpdatePrivilegeInput): Promise<any | null>;
  orderUpPrivilege(privilegeId: string): Promise<any[] | null>;
  orderDownPrivilege(privilegeId: string): Promise<any[] | null>;
  addPrivilegePool(appId: string, input: AddPrivilegePoolInput): Promise<any | null>;
  orderUpPrivilegePool(privilegePoolId: string): Promise<any[] | null>;
  orderDownPrivilegePool(privilegePoolId: string): Promise<any[] | null>;

  mapUserDoc(doc: any): User;
  mapUserDocs(docs: any[]): User[];
  mapDocs(collection: Collection, docs: any[]): any[];
  mapTenantDoc(doc: any): Tenant;
  mapTenantDocs(docs: any[]): Tenant[];
  mapAppDoc(doc: any): App;
  mapAppDocs(docs: any[]): App[];
  mapAppUserDoc(doc: any): AppUser;
  mapAppUserDocs(docs: any[]): AppUser[];
  mapPrivilegeDoc(doc: any): Privilege;
  mapPrivilegeDocs(docs: any[]): Privilege[];
  mapPrivilegePoolDoc(doc: any): PrivilegePool;
  mapPrivilegePoolDocs(doc: any[]): PrivilegePool[];
}
