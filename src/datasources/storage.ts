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
} from '../graphql/types';

export default interface Storage {
  getDocuments(collection: Collection, filter?: any): Promise<any[] | null>;
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

  mapDocs(collection: Collection, docs: any[]): any[] | null;
  mapAppDoc(doc: any): App;
  mapAppDocs(docs: any[]): App[];
  mapAppUserDoc(doc: any): AppUser;
  mapAppUserDocs(docs: any[]): AppUser[];
  mapPrivilegeDoc(doc: any): Privilege;
  mapPrivilegeDocs(docs: any[]): Privilege[];
  mapPrivilegePoolDoc(doc: any): PrivilegePool;
  mapPrivilegePoolDocs(doc: any[]): PrivilegePool[];
}
