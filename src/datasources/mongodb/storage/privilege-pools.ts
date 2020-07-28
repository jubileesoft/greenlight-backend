import MongoDbStorage from '../storage';
import mongo from 'mongodb';
import { Collection, PrivilegePool, AddPrivilegePoolInput } from '../../../graphql/types';
import { AppDoc, PrivilegeDoc, PrivilegePoolDoc } from '../docs';

const Query = {
  GET_PRIVILEGE_POOLS: 'getPrivilegePools',
};

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
      .toArray();

    MongoDbStorage.cache.setQueryResult(query, { appId }, docs);
    return docs;
  } catch (error) {
    return null;
  } finally {
    client?.close();
  }
}

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
