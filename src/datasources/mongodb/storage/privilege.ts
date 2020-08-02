import MongoDbStorage from '../storage';
import mongo from 'mongodb';
import { Collection, Privilege, UpdatePrivilegeInput } from '../../../graphql/types';
import { AppDoc, PrivilegeDoc, PrivilegePoolDoc } from '../docs';

const Query = {
  GET_PRIVILEGES: 'getPrivileges',
};

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

    return privilegeDoc;
  } catch (error) {
    return null;
  } finally {
    client?.close();
  }
}

// #endregion UpdatePrivilege
