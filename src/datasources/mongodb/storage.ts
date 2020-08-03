import mongo from 'mongodb';
import { Collection } from '../../graphql/types';
import { MongoDBConfig } from './config';
import Storage from '../storage';

import {
  MapAppDoc,
  MapAppDocs,
  MapAppUserDoc,
  MapAppUserDocs,
  AddApp,
  GetAppUsers,
  CreateAppApiKey1,
  GetAppFromAppUser,
  AddAppUser,
} from './storage/app';
import {
  MapPrivilegeDoc,
  MapPrivilegeDocs,
  GetPrivileges,
  UpdatePrivilege,
  AddPrivilege,
  GetAppFromPrivilege,
  OrderUpPrivilege,
  OrderDownPrivilege,
} from './storage/privilege';
import {
  MapPrivilegePoolDoc,
  MapPrivilegePoolDocs,
  GetPrivilegePools,
  AddPrivilegePool,
  OrderUpPrivilegePool,
  OrderDownPrivilegePool,
  GetAppFromPrivilegePool,
  GetPrivilegesFromPrivilegePool,
} from './storage/privilege-pool';
import MongoDbCache from './cache';

const collectionMap = new Map<Collection, string>();
collectionMap.set(Collection.apps, 'apps');
collectionMap.set(Collection.appusers, 'appusers');
collectionMap.set(Collection.privileges, 'privileges');
collectionMap.set(Collection.privilegepools, 'privilegepools');

export default class MongoDbStorage implements Storage {
  public config = MongoDBConfig;
  public collectionMap = collectionMap;
  public static cache = new MongoDbCache();

  mapAppDoc = MapAppDoc;
  mapAppDocs = MapAppDocs;
  mapAppUserDoc = MapAppUserDoc;
  mapAppUserDocs = MapAppUserDocs;
  addApp = AddApp;
  createAppApiKey1 = CreateAppApiKey1;
  getAppUsers = GetAppUsers;
  getAppFromAppUser = GetAppFromAppUser;
  addAppUser = AddAppUser;

  mapPrivilegeDoc = MapPrivilegeDoc;
  mapPrivilegeDocs = MapPrivilegeDocs;
  getPrivileges = GetPrivileges;
  updatePrivilege = UpdatePrivilege;
  addPrivilege = AddPrivilege;
  getAppFromPrivilege = GetAppFromPrivilege;
  orderUpPrivilege = OrderUpPrivilege;
  orderDownPrivilege = OrderDownPrivilege;

  mapPrivilegePoolDoc = MapPrivilegePoolDoc;
  mapPrivilegePoolDocs = MapPrivilegePoolDocs;
  getPrivilegePools = GetPrivilegePools;
  addPrivilegePool = AddPrivilegePool;
  orderUpPrivilegePool = OrderUpPrivilegePool;
  orderDownPrivilegePool = OrderDownPrivilegePool;
  getAppFromPrivilegePool = GetAppFromPrivilegePool;
  getPrivilegesFromPrivilegePool = GetPrivilegesFromPrivilegePool;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public mapDocs(collection: Collection, docs: any[]): any[] | null {
    switch (collection) {
      case Collection.apps:
        return this.mapAppDocs(docs);

      case Collection.appusers:
        return this.mapAppUserDocs(docs);

      case Collection.privileges:
        return this.mapPrivilegeDocs(docs);

      case Collection.privilegepools:
        return this.mapPrivilegePoolDocs(docs);

      default:
        return null;
    }
  }

  // #region Helper

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async getDocuments(collection: Collection, filter?: any): Promise<any[] | null> {
    const col = collectionMap.get(collection);
    if (!col) {
      return null;
    }

    let client: mongo.MongoClient | undefined;
    try {
      client = await this.getClient();

      const db = client.db(this.config.database);

      let transformedFilter = null;
      if (filter && typeof filter.id !== 'undefined') {
        transformedFilter = filter;
        transformedFilter._id = new mongo.ObjectID(filter.id);
        delete transformedFilter.id;
      }

      const docs = await db
        .collection(col)
        .find(transformedFilter ?? {})
        .toArray();

      return docs;
    } catch (error) {
      return null;
    } finally {
      client?.close();
    }
  }

  public async deleteDocument(collection: Collection, id: string): Promise<boolean> {
    const col = collectionMap.get(collection);
    if (!col) {
      return false;
    }

    let client: mongo.MongoClient | undefined;
    try {
      client = await this.getClient();

      const db = client.db(this.config.database);

      const filter = {
        _id: new mongo.ObjectID(id),
      };

      await db.collection(col).deleteOne(filter);

      return true;
    } catch (error) {
      return false;
    } finally {
      client?.close();
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async getDocument(collection: Collection, filter: any): Promise<any | null> {
    const col = collectionMap.get(collection);
    if (!col) {
      return null;
    }

    let client: mongo.MongoClient | undefined;
    try {
      client = await this.getClient();

      const db = client.db(this.config.database);
      const doc = await db.collection(col).findOne(filter);
      return doc;
    } catch (error) {
      return null;
    } finally {
      client?.close();
    }
  }

  public async getClient(): Promise<mongo.MongoClient> {
    return mongo.MongoClient.connect(this.config.url, {
      useUnifiedTopology: true,
    });
  }

  // #endregion Helper
}
