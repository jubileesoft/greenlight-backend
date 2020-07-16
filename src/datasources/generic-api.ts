import { DataSource } from 'apollo-datasource';
import { MicrosoftUser } from '@jubileesoft/amsel';
import Storage from './storage';
import {
  Collection,
  AppUser,
  AddAppUserInput,
  App,
  AddAppInput,
  AddPrivilegeInput,
  Privilege,
  AddPrivilegePoolInput,
  PrivilegePool,
  UpdatePrivilegeInput,
} from '../graphql/types';

export default class GenericApi extends DataSource {
  public context!: { user: MicrosoftUser };
  private storage: Storage;

  constructor(storage: Storage) {
    super();
    this.storage = storage;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialize(config: any): void {
    this.context = config.context;
  }

  // #region Public Methods

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async getCollection(collection: Collection, filter?: any): Promise<any[] | null> {
    const docs = await this.storage.getDocuments(collection, filter);
    if (!docs) {
      return null;
    }
    return this.storage.mapDocs(collection, docs);
  }

  public async deleteFromCollection(collection: Collection, id: string): Promise<boolean> {
    return this.storage.deleteDocument(collection, id);
  }

  public async getPrivileges(appId?: string): Promise<Privilege[] | null> {
    const docs = await this.storage.getPrivileges(appId);
    if (!docs) {
      return null;
    }
    return this.storage.mapPrivilegeDocs(docs);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async getAppUsers(appId: string): Promise<AppUser[] | null> {
    const docs = await this.storage.getAppUsers(appId);
    if (!docs) {
      return null;
    }
    return this.storage.mapDocs(Collection.appusers, docs);
  }

  public async getAppFromAppUser(appUserId: string): Promise<App | null> {
    const doc = await this.storage.getAppFromAppUser(appUserId);
    if (!doc) {
      return null;
    }
    return this.storage.mapAppDoc(doc);
  }

  public async getAppFromPrivilege(privilegeId: string): Promise<App | null> {
    const doc = await this.storage.getAppFromPrivilege(privilegeId);
    if (!doc) {
      return null;
    }
    return this.storage.mapAppDoc(doc);
  }

  public async getPrivilegePools(appId: string): Promise<PrivilegePool[] | null> {
    const docs = await this.storage.getPrivilegePools(appId);
    if (!docs) {
      return null;
    }
    return this.storage.mapPrivilegePoolDocs(docs);
  }

  public async getAppFromPrivilegePool(privilegePoolId: string): Promise<App | null> {
    const doc = await this.storage.getAppFromPrivilegePool(privilegePoolId);
    if (!doc) {
      return null;
    }
    return this.storage.mapAppDoc(doc);
  }

  public async getPrivilegesFromPrivilegePool(privilegePoolId: string): Promise<Privilege[] | null> {
    const docs = await this.storage.getPrivilegesFromPrivilegePool(privilegePoolId);
    if (!docs) {
      return null;
    }
    return this.storage.mapDocs(Collection.privileges, docs);
  }

  public async addAppUser(appId: string, input: AddAppUserInput): Promise<AppUser | null> {
    const doc = await this.storage.addAppUser(appId, input);
    if (!doc) {
      return null;
    }
    return this.storage.mapAppUserDoc(doc);
  }

  public async addApp(input: AddAppInput): Promise<App | null> {
    const doc = await this.storage.addApp(input);
    if (!doc) {
      return null;
    }
    return this.storage.mapAppDoc(doc);
  }

  public async createAppApiKey1(appId: string): Promise<string | null> {
    return this.storage.createAppApiKey1(appId);
  }

  public async addPrivilege(appId: string, input: AddPrivilegeInput): Promise<Privilege | null> {
    const doc = await this.storage.addPrivilege(appId, input);
    if (!doc) {
      return null;
    }
    return this.storage.mapPrivilegeDoc(doc);
  }

  public async updatePrivilege(privilegeId: string, input: UpdatePrivilegeInput): Promise<Privilege | null> {
    const doc = await this.storage.updatePrivilege(privilegeId, input);
    if (!doc) {
      return null;
    }
    return this.storage.mapPrivilegeDoc(doc);
  }

  public async orderUpPrivilege(privilegeId: string): Promise<Privilege[] | null> {
    const docs = await this.storage.orderUpPrivilege(privilegeId);
    if (!docs) {
      return null;
    }
    return this.storage.mapPrivilegeDocs(docs);
  }

  public async orderDownPrivilege(privilegeId: string): Promise<Privilege[] | null> {
    const docs = await this.storage.orderDownPrivilege(privilegeId);
    if (!docs) {
      return null;
    }
    return this.storage.mapPrivilegeDocs(docs);
  }

  public async addPrivilegePool(appId: string, input: AddPrivilegePoolInput): Promise<PrivilegePool | null> {
    const doc = await this.storage.addPrivilegePool(appId, input);
    if (!doc) {
      return null;
    }
    return this.storage.mapPrivilegePoolDoc(doc);
  }

  // #endregion Public Methods
}
