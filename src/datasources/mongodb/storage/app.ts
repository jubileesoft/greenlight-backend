import MongoDbStorage from '../storage';
import mongo from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import { AppDoc, AppUserDoc } from '../docs';
import { Collection, App, AppUser, AddAppInput, AddAppUserInput } from '../../../graphql/types';

// #region map functions

function mapAppDocToGql(doc: AppDoc): App {
  return {
    id: doc._id.toString(),
    name: doc.name,
    owner: doc.owner,
    apiKey1CreatedAt: doc.apiKey1CreatedAt,
  };
}

function mapAppUserDocToGql(doc: AppUserDoc): AppUser {
  return {
    id: doc._id.toString(),
    offId: doc.offId,
    email: doc.email,
    tags: doc.tags,
  };
}

export function MapAppDoc(doc: AppDoc): App {
  return mapAppDocToGql(doc);
}

export function MapAppDocs(docs: AppDoc[]): App[] {
  const apps: App[] = docs.map((doc) => {
    return mapAppDocToGql(doc);
  });
  return apps;
}

export function MapAppUserDoc(doc: AppUserDoc): AppUser {
  return mapAppUserDocToGql(doc);
}

export function MapAppUserDocs(docs: AppUserDoc[]): AppUser[] {
  const users: AppUser[] = docs.map((doc) => {
    return mapAppUserDocToGql(doc);
  });
  return users;
}

// #endregion map functions

// #region AddApp

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function AddApp(this: MongoDbStorage, input: AddAppInput): Promise<any | null> {
  const appsCollection = this.collectionMap.get(Collection.apps);
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

// #endregion AddApp

// #region GetAppUsers

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function GetAppUsers(this: MongoDbStorage, appId: string): Promise<any[] | null> {
  const col = this.collectionMap.get(Collection.appusers);
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

// #endregion GetAppUsers

// #region CreateAppApiKey1

export async function CreateAppApiKey1(this: MongoDbStorage, appId: string): Promise<string | null> {
  const appsCollection = this.collectionMap.get(Collection.apps);
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

// #endregion CreateAppApiKey1

// #region GetAppFromAppUser

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function GetAppFromAppUser(this: MongoDbStorage, appUserId: string): Promise<any | null> {
  const appUserDoc: AppUserDoc = await this.getDocument(Collection.appusers, { _id: new mongo.ObjectID(appUserId) });
  if (!appUserDoc) {
    return null;
  }
  return this.getDocument(Collection.apps, { _id: appUserDoc.app_id });
}

// #endregion GetAppFromAppUser

// #region AddAppUser

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function AddAppUser(this: MongoDbStorage, appId: string, input: AddAppUserInput): Promise<any | null> {
  const col = this.collectionMap.get(Collection.appusers);
  const appsCollection = this.collectionMap.get(Collection.apps);
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

// #endregion AddAppUser
