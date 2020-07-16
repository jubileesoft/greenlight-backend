import mongo from 'mongodb';
import { Collection, Privilege, PrivilegePool, AddPrivilegePoolInput } from '../../graphql/types';
import { MongoDBConfig } from './config';
import { AppDoc, AppUserDoc, PrivilegeDoc, PrivilegePoolDoc } from './docs';
import {
  App,
  AppUser,
  AddAppUserInput,
  AddAppInput,
  AddPrivilegeInput,
  UpdatePrivilegeInput,
} from '../../graphql/types';
import Storage from '../storage';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import { GetPrivilegePools } from './storage/privilege-pools';
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

  // #region Interface Methods

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async getPrivileges(appId?: string): Promise<any[] | null> {
    const col = collectionMap.get(Collection.privileges);
    if (!col) {
      return null;
    }

    let client: mongo.MongoClient | undefined;
    try {
      client = await this.getClient();

      const db = client.db(this.config.database);
      const docs = await db
        .collection(col)
        // eslint-disable-next-line @typescript-eslint/camelcase
        .find(appId ? { app_id: new mongo.ObjectID(appId) } : undefined)
        .toArray();
      return docs;
    } catch (error) {
      return null;
    } finally {
      client?.close();
    }
  }

  public async updatePrivilege(privilegeId: string, input: UpdatePrivilegeInput): Promise<any | null> {
    const col = collectionMap.get(Collection.privileges);
    if (!col) {
      return null;
    }

    if (Object.keys(input).length === 0) {
      return null;
    }

    let client: mongo.MongoClient | undefined;
    try {
      client = await this.getClient();

      const db = client.db(this.config.database);
      // eslint-disable-next-line @typescript-eslint/camelcase
      const filter = { _id: new mongo.ObjectID(privilegeId) };
      const updateQuery = { $set: input };
      await db.collection(col).updateOne(filter, updateQuery);

      const privilegeDoc: PrivilegeDoc | null = await db.collection(col).findOne(filter);

      return privilegeDoc;
    } catch (error) {
      return null;
    } finally {
      client?.close();
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async getAppUsers(appId: string): Promise<any[] | null> {
    const col = collectionMap.get(Collection.appusers);
    if (!col) {
      return null;
    }

    let client: mongo.MongoClient | undefined;
    try {
      client = await this.getClient();

      const db = client.db(this.config.database);
      const docs = await db
        .collection(col)
        // eslint-disable-next-line @typescript-eslint/camelcase
        .find({ app_id: new mongo.ObjectID(appId) })
        .toArray();
      return docs;
    } catch (error) {
      return null;
    } finally {
      client?.close();
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async getAppFromAppUser(appUserId: string): Promise<any | null> {
    const appUserDoc: AppUserDoc = await this.getDocument(Collection.appusers, { _id: new mongo.ObjectID(appUserId) });
    if (!appUserDoc) {
      return null;
    }
    return this.getDocument(Collection.apps, { _id: appUserDoc.app_id });
  }

  // #region Map Functions

  public mapAppDoc(doc: AppDoc): App {
    return this.mapAppDocToGql(doc);
  }

  public mapAppDocs(docs: AppDoc[]): App[] {
    const apps: App[] = docs.map((doc) => {
      return this.mapAppDocToGql(doc);
    });
    return apps;
  }

  public mapAppUserDoc(doc: AppUserDoc): AppUser {
    return this.mapAppUserDocToGql(doc);
  }

  public mapAppUserDocs(docs: AppUserDoc[]): AppUser[] {
    const users: AppUser[] = docs.map((doc) => {
      return this.mapAppUserDocToGql(doc);
    });
    return users;
  }

  public mapPrivilegeDoc(doc: PrivilegeDoc): Privilege {
    return this.mapPrivilegeDocToGql(doc);
  }

  public mapPrivilegeDocs(docs: PrivilegeDoc[]): Privilege[] {
    const privileges: Privilege[] = docs.map((doc) => {
      return this.mapPrivilegeDocToGql(doc);
    });
    return privileges;
  }

  public mapPrivilegePoolDoc(doc: PrivilegePoolDoc): PrivilegePool {
    return this.mapPrivilegePoolDocToGql(doc);
  }

  public mapPrivilegePoolDocs(docs: PrivilegePoolDoc[]): PrivilegePool[] {
    const privilegePools: PrivilegePool[] = docs.map((doc) => {
      return this.mapPrivilegePoolDocToGql(doc);
    });
    return privilegePools;
  }

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

  // #endregion Map Functions

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async getAppFromPrivilege(privilegeId: string): Promise<any | null> {
    const privilegeDoc: PrivilegeDoc = await this.getDocument(Collection.privileges, {
      _id: new mongo.ObjectID(privilegeId),
    });
    if (!privilegeDoc) {
      return null;
    }

    return this.getDocument(Collection.apps, { _id: privilegeDoc.app_id });
  }

  public getPrivilegePools = GetPrivilegePools;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async getAppFromPrivilegePool(privilegePoolId: string): Promise<any | null> {
    const privilegePoolDoc: PrivilegePoolDoc = await this.getDocument(Collection.privilegepools, {
      _id: new mongo.ObjectID(privilegePoolId),
    });
    if (!privilegePoolDoc) {
      return null;
    }

    return this.getDocument(Collection.apps, { _id: privilegePoolDoc.app_id });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async getPrivilegesFromPrivilegePool(privilegePoolId: string): Promise<any[] | null> {
    const privilegePoolDoc: PrivilegePoolDoc = await this.getDocument(Collection.privilegepools, {
      _id: new mongo.ObjectID(privilegePoolId),
    });
    if (!privilegePoolDoc) {
      return null;
    }

    if (!privilegePoolDoc.privilege_ids) {
      return [];
    }

    // Build Filter
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filterArray: any[] = [];
    privilegePoolDoc.privilege_ids.forEach((_id) => {
      filterArray.push({
        _id: _id,
      });
    });
    return this.getDocuments(Collection.privileges, { $or: filterArray });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async addAppUser(appId: string, input: AddAppUserInput): Promise<any | null> {
    const col = collectionMap.get(Collection.appusers);
    const appsCollection = collectionMap.get(Collection.apps);
    if (!col || !appsCollection) {
      return null;
    }

    let client: mongo.MongoClient | undefined;
    try {
      client = await this.getClient();

      const db = client.db(this.config.database);

      const appDoc = await db.collection(appsCollection).findOne({ _id: new mongo.ObjectID(appId) });
      if (!appDoc) {
        return null; // no app found with the given appId
      }

      // eslint-disable-next-line @typescript-eslint/camelcase
      const userDoc = await db.collection(col).findOne({ app_id: appDoc._id, offId: input.offId });
      if (userDoc) {
        // A user with the same offId already exists. Just return this one.
        return userDoc;
      }

      const newAppUserDoc: AppUserDoc = {
        _id: new mongo.ObjectID(),
        // eslint-disable-next-line @typescript-eslint/camelcase
        app_id: appDoc._id,
        email: input.email,
        offId: input.offId,
        tags: input.tags,
      };

      await db.collection(col).insertOne(newAppUserDoc);
      return newAppUserDoc;
    } catch (error) {
      return null;
    } finally {
      client?.close();
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async addApp(input: AddAppInput): Promise<any | null> {
    const appsCollection = collectionMap.get(Collection.apps);
    if (!appsCollection) {
      return null;
    }

    let client: mongo.MongoClient | undefined;
    try {
      client = await this.getClient();

      const db = client.db(this.config.database);

      const newApp: AppDoc = {
        _id: new mongo.ObjectID(),
        owner: input.owner,
        name: input.name,
        apiKey1CreatedAt: null,
        apiKey1Hash: null,
      };
      await db.collection(appsCollection).insertOne(newApp);
      return newApp;
    } catch (error) {
      return null;
    } finally {
      client?.close();
    }
  }

  public async createAppApiKey1(appId: string): Promise<string | null> {
    const appsCollection = collectionMap.get(Collection.apps);
    if (!appsCollection) {
      return null;
    }
    let client: mongo.MongoClient | undefined;
    try {
      client = await this.getClient();

      const db = client.db(this.config.database);

      const filter = { _id: new mongo.ObjectID(appId) };

      const apiKey = uuidv4();
      const apiKeyHash = await bcrypt.hash(apiKey, 10);

      const updateQuery = { $set: { apiKey1CreatedAt: new Date(), apiKey1Hash: apiKeyHash } };

      await db.collection(appsCollection).updateOne(filter, updateQuery);

      return apiKey;
    } catch (error) {
      return null;
    } finally {
      client?.close();
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async addPrivilege(appId: string, input: AddPrivilegeInput): Promise<any | null> {
    const appsCollection = collectionMap.get(Collection.apps);
    const privilegesCollection = collectionMap.get(Collection.privileges);
    if (!appsCollection || !privilegesCollection) {
      return null;
    }

    let client: mongo.MongoClient | undefined;
    try {
      client = await this.getClient();

      const db = client.db(this.config.database);

      // Get app
      const appDoc: AppDoc | null = await db.collection(appsCollection).findOne({ _id: new mongo.ObjectID(appId) });
      if (!appDoc) {
        return null;
      }

      const newDoc: PrivilegeDoc = {
        _id: new mongo.ObjectID(),
        // eslint-disable-next-line @typescript-eslint/camelcase
        app_id: appDoc._id,
        name: input.name,
        order: Date.now().toString(),
        short: input.short,
        tags: input.tags,
      };
      await db.collection(privilegesCollection).insertOne(newDoc);
      return newDoc;
    } catch (error) {
      return null;
    } finally {
      client?.close();
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async addPrivilegePool(appId: string, input: AddPrivilegePoolInput): Promise<any | null> {
    const appsCollection = collectionMap.get(Collection.apps);
    const privilegesCollection = collectionMap.get(Collection.privileges);
    const privilegePoolsCollection = collectionMap.get(Collection.privilegepools);
    if (!appsCollection || !privilegePoolsCollection || !privilegesCollection) {
      return null;
    }

    let client: mongo.MongoClient | undefined;
    try {
      client = await this.getClient();

      const db = client.db(this.config.database);

      // Get app doc
      const appDoc: AppDoc | null = await db.collection(appsCollection).findOne({ _id: new mongo.ObjectID(appId) });
      if (!appDoc) {
        return null;
      }

      // Get privilege docs
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const privilegeFilter: any = [];
      input.privilegeIds.forEach((privilegeId) => {
        privilegeFilter.push({ _id: new mongo.ObjectID(privilegeId) });
      });
      const privilegeDocs: PrivilegeDoc[] = await db
        .collection(privilegesCollection)
        .find({ $or: privilegeFilter })
        .toArray();

      if (privilegeDocs.length === 0) {
        return null;
      }

      const newDoc: PrivilegePoolDoc = {
        _id: new mongo.ObjectID(),
        // eslint-disable-next-line @typescript-eslint/camelcase
        app_id: appDoc._id,
        name: input.name,
        order: Date.now().toString(),
        short: input.short,
        tags: input.tags,
        // eslint-disable-next-line @typescript-eslint/camelcase
        privilege_ids: privilegeDocs.map((privilegeDoc) => privilegeDoc._id),
      };
      await db.collection(privilegePoolsCollection).insertOne(newDoc);
      return newDoc;
    } catch (error) {
      return null;
    } finally {
      client?.close();
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async orderUpPrivilege(privilegeId: string): Promise<any[] | null> {
    const privilegesCollection = collectionMap.get(Collection.privileges);

    if (!privilegesCollection) {
      return null;
    }

    let client: mongo.MongoClient | undefined;
    try {
      client = await this.getClient();
      const db = client.db(this.config.database);
      const privilegeDoc: PrivilegeDoc | null = await db
        .collection(privilegesCollection)
        .findOne({ _id: new mongo.ObjectID(privilegeId) });

      if (!privilegeDoc) {
        return null;
      }

      const filter = {
        // eslint-disable-next-line @typescript-eslint/camelcase
        app_id: privilegeDoc.app_id,
        order: { $lt: privilegeDoc.order },
      };

      const upPrivilegeDocs: PrivilegeDoc[] | null = await db
        .collection(privilegesCollection)
        .find(filter)
        .sort({ order: -1 })
        .limit(1)
        .toArray();

      if (!Array.isArray(upPrivilegeDocs) || upPrivilegeDocs.length === 0) {
        return null;
      }

      const upPrivilegeDoc = upPrivilegeDocs[0];

      // Now that we have the two privileges: do the swapping

      const lowerOrder = upPrivilegeDoc.order;
      const upperOrder = privilegeDoc.order;

      // Update privilege (will become lower order privilege)
      const filter2 = { _id: privilegeDoc._id };
      const updateQuery2 = { $set: { order: lowerOrder } };
      await db.collection(privilegesCollection).updateOne(filter2, updateQuery2);
      privilegeDoc.order = lowerOrder;

      // Update previous upper privilege (will become lower privilege)
      const filter3 = { _id: upPrivilegeDoc._id };
      const updateQuery3 = { $set: { order: upperOrder } };
      await db.collection(privilegesCollection).updateOne(filter3, updateQuery3);
      upPrivilegeDoc.order = upperOrder;

      return [privilegeDoc, upPrivilegeDoc];
    } catch (error) {
      return null;
    } finally {
      client?.close();
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async orderDownPrivilege(privilegeId: string): Promise<any[] | null> {
    const privilegesCollection = collectionMap.get(Collection.privileges);

    if (!privilegesCollection) {
      return null;
    }

    let client: mongo.MongoClient | undefined;
    try {
      client = await this.getClient();
      const db = client.db(this.config.database);
      const privilegeDoc: PrivilegeDoc | null = await db
        .collection(privilegesCollection)
        .findOne({ _id: new mongo.ObjectID(privilegeId) });

      if (!privilegeDoc) {
        return null;
      }

      const filter = {
        // eslint-disable-next-line @typescript-eslint/camelcase
        app_id: privilegeDoc.app_id,
        order: { $gt: privilegeDoc.order },
      };

      const downPrivilegeDocs: PrivilegeDoc[] | null = await db
        .collection(privilegesCollection)
        .find(filter)
        .sort({ order: 1 })
        .limit(1)
        .toArray();

      if (!Array.isArray(downPrivilegeDocs) || downPrivilegeDocs.length === 0) {
        return null;
      }

      const downPrivilegeDoc = downPrivilegeDocs[0];

      // Now that we have the two privileges: do the swapping

      const lowerOrder = privilegeDoc.order;
      const upperOrder = downPrivilegeDoc.order;

      // Update privilege (will become upper order privilege)
      const filter2 = { _id: privilegeDoc._id };
      const updateQuery2 = { $set: { order: upperOrder } };
      await db.collection(privilegesCollection).updateOne(filter2, updateQuery2);
      privilegeDoc.order = upperOrder;

      // Update previous upper privilege (will become lower order privilege)
      const filter3 = { _id: downPrivilegeDoc._id };
      const updateQuery3 = { $set: { order: lowerOrder } };
      await db.collection(privilegesCollection).updateOne(filter3, updateQuery3);
      downPrivilegeDoc.order = lowerOrder;

      return [downPrivilegeDoc, privilegeDoc];
    } catch (error) {
      return null;
    } finally {
      client?.close();
    }
  }

  // #endregion Interface Methods

  // #region Private Methods

  public async getClient(): Promise<mongo.MongoClient> {
    return mongo.MongoClient.connect(this.config.url, {
      useUnifiedTopology: true,
    });
  }

  private mapAppDocToGql(doc: AppDoc): App {
    return {
      id: doc._id.toString(),
      name: doc.name,
      owner: doc.owner,
      apiKey1CreatedAt: doc.apiKey1CreatedAt,
    };
  }

  private mapAppUserDocToGql(doc: AppUserDoc): AppUser {
    return {
      id: doc._id.toString(),
      offId: doc.offId,
      email: doc.email,
      tags: doc.tags,
    };
  }

  private mapPrivilegeDocToGql(doc: PrivilegeDoc): Privilege {
    return {
      id: doc._id.toString(),
      name: doc.name,
      order: doc.order,
      short: doc.short,
      tags: doc.tags,
    };
  }

  private mapPrivilegePoolDocToGql(doc: PrivilegePoolDoc): PrivilegePool {
    return {
      id: doc._id.toString(),
      name: doc.name,
      order: doc.order,
      short: doc.short,
      tags: doc.tags,
    };
  }

  // #endregion Private Methods
}
