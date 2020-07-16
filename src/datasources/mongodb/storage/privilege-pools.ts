import MongoDbStorage from '../storage';
import mongo from 'mongodb';
import { Collection, PrivilegePool } from '../../../graphql/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function GetPrivilegePools(this: MongoDbStorage, appId: string): Promise<any[] | null> {
  const query = 'getPrivilegePools';

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
