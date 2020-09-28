// #region map functions

import MongoDbStorage from '../storage';
import mongo from 'mongodb';
import { Collection, UserRoleType, User, UserRole } from '../../../graphql/types';
import { UserDoc } from '../docs';
import { Query as StorageQuery } from '../storage';

const Query = {
  GET_ME: 'getMe',
};

// #endregion map functions

function mapUserDocToGql(doc: UserDoc): User {
  const roles: UserRole[] = [];

  doc.roles.forEach((docRole) => {
    switch (docRole) {
      case UserRoleType.ADMIN:
        roles.push({
          type: UserRoleType.ADMIN,
        });
        break;

      case UserRoleType.TENANT_ADMIN:
        roles.push({
          type: UserRoleType.TENANT_ADMIN,
          ids: [],
        });
        break;

      case UserRoleType.APP_ADMIN:
        roles.push({
          type: UserRoleType.APP_ADMIN,
          ids: [],
        });
        break;

      default:
        break;
    }
  });

  return {
    id: doc._id.toString(),
    email: doc.email,
    roles,
  };
}

export function MapUserDoc(doc: UserDoc): User {
  return mapUserDocToGql(doc);
}

export function MapUserDocs(docs: UserDoc[]): User[] {
  const users: User[] = docs.map((doc) => {
    return mapUserDocToGql(doc);
  });
  return users;
}

// #region GetMe

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function GetMe(this: MongoDbStorage, email: string): Promise<any | null> {
  const query = Query.GET_ME;

  const cachedData = MongoDbStorage.cache.getQueryResult(query, { email });
  if (typeof cachedData !== 'undefined') {
    if (Array.isArray(cachedData)) {
      return cachedData[0];
    } else {
      return cachedData;
    }
  }

  const usersCollection = this.collectionMap.get(Collection.users);
  if (!usersCollection) {
    return null;
  }

  let client: mongo.MongoClient | undefined;
  try {
    client = await this.getClient();

    const db = client.db(this.config.database);
    const doc: UserDoc | null = await db.collection(usersCollection).findOne({ email: email.toLowerCase() });

    // Check if the user is one of the GLOBAL ADMINS. If so, create a new entry when nothing is available.
    if (!doc) {
      MongoDbStorage.cache.setQueryResult(query, { email }, null);
    } else {
      MongoDbStorage.cache.setQueryResult(query, { email }, [doc]);
    }

    return doc;
  } catch (error) {
    return null;
  } finally {
    client?.close();
  }
}

export async function CreateAdminUsers(this: MongoDbStorage): Promise<void> {
  const admins = process.env.ADMINS?.toLowerCase().split(',');
  if (!admins) {
    // This is bad. At least 1 admin user should be defined.
    throw new Error('Cannot create admin users (no admin users defined).');
  }

  const usersCollection = this.collectionMap.get(Collection.users);
  if (!usersCollection) {
    throw new Error('Cannot create admin users (internal collection error).');
  }

  const users: User[] | null = await this.getDocuments(Collection.users);
  if (users == null) {
    // This is bad and will most likely prevent us from creating the
    // admin users in the database.
    throw new Error(
      `There was a problem retrieving the users from the database > Aborting the creation of admin users.`,
    );
  }

  const newAdminUserDocs: UserDoc[] = [];

  let client: mongo.MongoClient | undefined;
  let db: mongo.Db | undefined;
  try {
    for (const admin of admins) {
      if (
        !users.find((x) => {
          return x.email.toLowerCase() === admin.toLowerCase();
        })
      ) {
        if (!client || !db) {
          client = await this.getClient();
          db = client.db(this.config.database);
        }

        const newAdminUserDoc: UserDoc = {
          _id: new mongo.ObjectID(),
          email: admin.toLowerCase(),
          roles: [UserRoleType.ADMIN],
        };

        await db.collection(usersCollection).insertOne(newAdminUserDoc);
        newAdminUserDocs.push(newAdminUserDoc);
      }
    }
  } catch (error) {
    throw new Error(
      `There was a problem creating the admin users in the database > Aborting the creation of admin users.`,
    );
  } finally {
    client?.close();
  }

  if (newAdminUserDocs.length > 0) {
    MongoDbStorage.cache.purgeQueryResult(StorageQuery.GET_COLLECTION_USERS);
  }
}

// #endregion GetMe
