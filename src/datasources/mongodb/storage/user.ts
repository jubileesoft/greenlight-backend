// #region map functions

import MongoDbStorage from '../storage';
import mongo from 'mongodb';
import { Collection, UserRoleType, User, UserRole } from '../../../graphql/types';
import { UserDoc } from '../docs';

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
    let doc: UserDoc | null = await db.collection(usersCollection).findOne({ email: email.toLowerCase() });

    // Check if the user is one of the GLOBAL ADMINS. If so, create a new entry when nothing is available.
    if (!doc) {
      if (process.env.ADMINS?.toLowerCase().split(',').includes(email.toLowerCase())) {
        doc = {
          _id: new mongo.ObjectID(),
          email: email.toLowerCase(),
          roles: [UserRoleType.ADMIN],
        };

        await db.collection(usersCollection).insertOne(doc);
        MongoDbStorage.cache.setQueryResult(query, { email }, [doc]);
      } else {
        MongoDbStorage.cache.setQueryResult(query, { email }, null);
      }
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

// #endregion GetMe
