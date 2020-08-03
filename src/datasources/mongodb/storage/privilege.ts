import MongoDbStorage from '../storage';
import mongo from 'mongodb';
import { Collection, Privilege, UpdatePrivilegeInput, AddPrivilegeInput } from '../../../graphql/types';
import { AppDoc, PrivilegeDoc } from '../docs';

const Query = {
  GET_PRIVILEGES: 'getPrivileges',
};

// #region map functions

function mapPrivilegeDocToGql(doc: PrivilegeDoc): Privilege {
  return {
    id: doc._id.toString(),
    name: doc.name,
    order: doc.order,
    short: doc.short,
    tags: doc.tags,
  };
}

export function MapPrivilegeDoc(doc: PrivilegeDoc): Privilege {
  return mapPrivilegeDocToGql(doc);
}

export function MapPrivilegeDocs(docs: PrivilegeDoc[]): Privilege[] {
  const privileges: Privilege[] = docs.map((doc) => {
    return mapPrivilegeDocToGql(doc);
  });
  return privileges;
}

// #endregion map functions

// #region GetPrivileges

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function GetPrivileges(this: MongoDbStorage, appId?: string): Promise<any[] | null> {
  const query = Query.GET_PRIVILEGES;

  const cachedData = MongoDbStorage.cache.getQueryResult(query, { appId });
  if (cachedData) {
    return cachedData;
  }

  const col = this.collectionMap.get(Collection.privileges);
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

    MongoDbStorage.cache.setQueryResult(query, { appId }, docs);
    return docs;
  } catch (error) {
    return null;
  } finally {
    client?.close();
  }
}

// #endregion GetPrivileges

// #region AddPrivilege

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function AddPrivilege(this: MongoDbStorage, appId: string, input: AddPrivilegeInput): Promise<any | null> {
  const appsCollection = this.collectionMap.get(Collection.apps);
  const privilegesCollection = this.collectionMap.get(Collection.privileges);
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

    // Purge Cache
    MongoDbStorage.cache.purgeQueryResult(Query.GET_PRIVILEGES, { appId: appDoc._id.toString() });

    return newDoc;
  } catch (error) {
    return null;
  } finally {
    client?.close();
  }
}

// #endregion AddPrivilege

// #region UpdatePrivilege

export async function UpdatePrivilege(
  this: MongoDbStorage,
  privilegeId: string,
  input: UpdatePrivilegeInput,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any | null> {
  const col = this.collectionMap.get(Collection.privileges);
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

    // Purge Cache
    MongoDbStorage.cache.purgeQueryResult(Query.GET_PRIVILEGES, { appId: privilegeDoc?.app_id.toString() });

    return privilegeDoc;
  } catch (error) {
    return null;
  } finally {
    client?.close();
  }
}

// #endregion UpdatePrivilege

// #region GetAppFromPrivilege

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function GetAppFromPrivilege(this: MongoDbStorage, privilegeId: string): Promise<any | null> {
  const privilegeDoc: PrivilegeDoc = await this.getDocument(Collection.privileges, {
    _id: new mongo.ObjectID(privilegeId),
  });
  if (!privilegeDoc) {
    return null;
  }

  return this.getDocument(Collection.apps, { _id: privilegeDoc.app_id });
}

// #endregion GetAppFromPrivilege

// #region OrderUpPrivilege

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function OrderUpPrivilege(this: MongoDbStorage, privilegeId: string): Promise<any[] | null> {
  const privilegesCollection = this.collectionMap.get(Collection.privileges);

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

    // Update privilege: will get lower order
    const filter2 = { _id: privilegeDoc._id };
    const updateQuery2 = { $set: { order: lowerOrder } };
    await db.collection(privilegesCollection).updateOne(filter2, updateQuery2);
    privilegeDoc.order = lowerOrder;

    // Update upPrivilege: will get upper order
    const filter3 = { _id: upPrivilegeDoc._id };
    const updateQuery3 = { $set: { order: upperOrder } };
    await db.collection(privilegesCollection).updateOne(filter3, updateQuery3);
    upPrivilegeDoc.order = upperOrder;

    // Purge Cache
    MongoDbStorage.cache.purgeQueryResult(Query.GET_PRIVILEGES, { appId: privilegeDoc?.app_id.toString() });

    return [privilegeDoc, upPrivilegeDoc];
  } catch (error) {
    return null;
  } finally {
    client?.close();
  }
}

// #endregion OrderUpPrivilege

// #region OrderDownPrivilege

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function OrderDownPrivilege(this: MongoDbStorage, privilegeId: string): Promise<any[] | null> {
  const privilegesCollection = this.collectionMap.get(Collection.privileges);

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

    // Purge Cache
    MongoDbStorage.cache.purgeQueryResult(Query.GET_PRIVILEGES, { appId: privilegeDoc?.app_id.toString() });

    return [downPrivilegeDoc, privilegeDoc];
  } catch (error) {
    return null;
  } finally {
    client?.close();
  }
}

// #endregion OrderDownPrivilege
