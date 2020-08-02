import MongoDbStorage from '../storage';
import mongo from 'mongodb';
import { Collection, PrivilegePool, AddPrivilegePoolInput } from '../../../graphql/types';
import { AppDoc, PrivilegeDoc, PrivilegePoolDoc } from '../docs';

const Query = {
  GET_PRIVILEGE_POOLS: 'getPrivilegePools',
};

// #region GetPrivilegePools

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function GetPrivilegePools(this: MongoDbStorage, appId: string): Promise<any[] | null> {
  const query = Query.GET_PRIVILEGE_POOLS;

  const cachedData = MongoDbStorage.cache.getQueryResult(query, { appId });
  if (cachedData) {
    return cachedData;
  }

  const col = this.collectionMap.get(Collection.privilegepools);
  if (!col) {
    return null;
  }

  let client: mongo.MongoClient | undefined;
  try {
    client = await this.getClient();

    const db = client.db(this.config.database);
    const docs: PrivilegePool[] = await db
      .collection(col)
      // eslint-disable-next-line @typescript-eslint/camelcase
      .find(appId ? { app_id: new mongo.ObjectID(appId) } : undefined)
      .sort({ order: 1 })
      .toArray();

    MongoDbStorage.cache.setQueryResult(query, { appId }, docs);
    return docs;
  } catch (error) {
    return null;
  } finally {
    client?.close();
  }
}

// #endregion GetPrivilegePools

// #region AddPrivilegePool

export async function AddPrivilegePool(
  this: MongoDbStorage,
  appId: string,
  input: AddPrivilegePoolInput,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any | null> {
  const appsCollection = this.collectionMap.get(Collection.apps);
  const privilegesCollection = this.collectionMap.get(Collection.privileges);
  const privilegePoolsCollection = this.collectionMap.get(Collection.privilegepools);
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

    // Purge Cache
    MongoDbStorage.cache.purgeQueryResult(Query.GET_PRIVILEGE_POOLS, { appId });

    return newDoc;
  } catch (error) {
    return null;
  } finally {
    client?.close();
  }
}

// #endregion AddPrivilegePool

// #region OrderUpPrivilegePool

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function OrderUpPrivilegePool(this: MongoDbStorage, privilegePoolId: string): Promise<any[] | null> {
  const col = this.collectionMap.get(Collection.privilegepools);
  if (!col) {
    return null;
  }

  let client: mongo.MongoClient | undefined;
  try {
    client = await this.getClient();
    const db = client.db(this.config.database);

    const privilegePoolDoc: PrivilegePoolDoc | null = await db
      .collection(col)
      .findOne({ _id: new mongo.ObjectID(privilegePoolId) });
    if (!privilegePoolDoc) {
      return null;
    }

    const filter = {
      // eslint-disable-next-line @typescript-eslint/camelcase
      app_id: privilegePoolDoc.app_id,
      order: { $lt: privilegePoolDoc.order },
    };

    const upPrivilegePoolDocs: PrivilegePoolDoc[] | null = await db
      .collection(col)
      .find(filter)
      .sort({ order: -1 })
      .limit(1)
      .toArray();

    if (!Array.isArray(upPrivilegePoolDocs) || upPrivilegePoolDocs.length === 0) {
      return null;
    }

    const upPrivilegePoolDoc = upPrivilegePoolDocs[0];

    // Now that we have the two privilegePools: do the swapping

    const lowerOrder = upPrivilegePoolDoc.order;
    const upperOrder = privilegePoolDoc.order;

    // Update privilegePool: will get lower order
    const filter2 = { _id: privilegePoolDoc._id };
    const updateQuery2 = { $set: { order: lowerOrder } };
    await db.collection(col).updateOne(filter2, updateQuery2);
    privilegePoolDoc.order = lowerOrder;

    // Update upPrivilegePool: will get upper order
    const filter3 = { _id: upPrivilegePoolDoc._id };
    const updateQuery3 = { $set: { order: upperOrder } };
    await db.collection(col).updateOne(filter3, updateQuery3);
    upPrivilegePoolDoc.order = upperOrder;

    // Purge Cache
    MongoDbStorage.cache.purgeQueryResult(Query.GET_PRIVILEGE_POOLS, { appId: privilegePoolDoc.app_id.toString() });

    return [privilegePoolDoc, upPrivilegePoolDoc];
  } catch (error) {
    return null;
  } finally {
    client?.close();
  }
}

// #endregion OrderUpPrivilegePool

// #region OrderDownPrivilegePool

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function OrderDownPrivilegePool(this: MongoDbStorage, privilegePoolId: string): Promise<any[] | null> {
  const col = this.collectionMap.get(Collection.privilegepools);
  if (!col) {
    return null;
  }

  let client: mongo.MongoClient | undefined;
  try {
    client = await this.getClient();
    const db = client.db(this.config.database);

    const privilegePoolDoc: PrivilegePoolDoc | null = await db
      .collection(col)
      .findOne({ _id: new mongo.ObjectID(privilegePoolId) });
    if (!privilegePoolDoc) {
      return null;
    }

    const filter = {
      // eslint-disable-next-line @typescript-eslint/camelcase
      app_id: privilegePoolDoc.app_id,
      order: { $gt: privilegePoolDoc.order },
    };

    const downPrivilegePoolDocs: PrivilegePoolDoc[] | null = await db
      .collection(col)
      .find(filter)
      .sort({ order: 1 })
      .limit(1)
      .toArray();

    if (!Array.isArray(downPrivilegePoolDocs) || downPrivilegePoolDocs.length === 0) {
      return null;
    }

    const downPrivilegePoolDoc = downPrivilegePoolDocs[0];

    // Now that we have the two privilegePools: do the swapping

    const lowerOrder = privilegePoolDoc.order;
    const upperOrder = downPrivilegePoolDoc.order;

    // Update privilegePool: will get upper order
    const filter2 = { _id: privilegePoolDoc._id };
    const updateQuery2 = { $set: { order: upperOrder } };
    await db.collection(col).updateOne(filter2, updateQuery2);
    privilegePoolDoc.order = upperOrder;

    // Update downPrivilegePool: will get lower order
    const filter3 = { _id: downPrivilegePoolDoc._id };
    const updateQuery3 = { $set: { order: lowerOrder } };
    await db.collection(col).updateOne(filter3, updateQuery3);
    downPrivilegePoolDoc.order = lowerOrder;

    // Purge Cache
    MongoDbStorage.cache.purgeQueryResult(Query.GET_PRIVILEGE_POOLS, { appId: privilegePoolDoc.app_id.toString() });

    return [downPrivilegePoolDoc, privilegePoolDoc];
  } catch (error) {
    return null;
  } finally {
    client?.close();
  }
}

// #endregion OrderDownPrivilegePool
