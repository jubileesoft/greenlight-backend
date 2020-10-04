import mongo from 'mongodb';
import { AddTenantInput, Collection, Tenant, UserRoleType } from '../../../graphql/types';
import { TenantDoc, UserDoc } from '../docs';
import MongoDbStorage from '../storage';

// #region Mapping Functions

function mapTenantDocToGql(doc: TenantDoc): Tenant {
  return {
    id: doc._id.toString(),
    name: doc.name,
    admins: doc.admins,
  };
}

export function MapTenantDoc(doc: TenantDoc): Tenant {
  return mapTenantDocToGql(doc);
}

export function MapTenantDocs(docs: TenantDoc[]): Tenant[] {
  const tenants: Tenant[] = docs.map((doc) => {
    return mapTenantDocToGql(doc);
  });
  return tenants;
}

// #endregion Mapping Functions

// #region Private Helper

function validateEmail(mail: string): RegExpMatchArray | null {
  const mailFormat = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
  return mail.match(mailFormat);
}

function getEmails(adminEmails: string): string[] | null {
  const admins = adminEmails?.split(',');
  if (!admins) {
    return null;
  }

  const emails: string[] = [];

  for (const admin of admins) {
    if (!validateEmail(admin.trim())) {
      return null;
    }
    emails.push(admin.trim().toLowerCase());
  }

  return emails;
}

// #endregion Private Helper

// #region AddTenant

export async function AddTenant(this: MongoDbStorage, input: AddTenantInput): Promise<any> {
  const adminEmails: string[] | null = getEmails(input.adminEmails);
  if (!adminEmails) {
    throw new Error('Cannot add tenant. Admin emails are invalid. ' + JSON.stringify(input));
  }

  if (adminEmails.length === 0) {
    throw new Error('Cannot add tenant. No admin emails defined.' + JSON.stringify(input));
  }

  const tenants: TenantDoc[] = await this.getDocuments(Collection.tenants);

  if (
    tenants.find((tenant) => {
      return tenant.name.toLowerCase() === input.name.toLowerCase().trim();
    })
  ) {
    throw new Error('Cannot add tenant. A tenant with that name is already present. ' + JSON.stringify(input));
  }

  const client = await this.getClient();
  const db = client.db(this.config.database);

  // Create TENANT AND admin USERS

  const newTenantDoc: TenantDoc = {
    _id: new mongo.ObjectID(),
    name: input.name.trim(),
    admins: adminEmails,
  };
  await db.collection(Collection.tenants).insertOne(newTenantDoc);

  const users: UserDoc[] = await this.getDocuments(Collection.users);

  let newUserAdded = false;
  for (const adminEmail of adminEmails) {
    let userDoc: UserDoc | undefined = users.find((user) => user.email === adminEmail.trim().toLowerCase());
    if (userDoc) {
      // The user already exists in the database.
      // Just add the created tenant for his tenantAdmin role.

      const roles: string[] = userDoc.roles;
      if (!roles.includes(UserRoleType.TENANT_ADMIN.toString())) {
        roles.push(UserRoleType.TENANT_ADMIN.toString());
      }

      const tenantIds: string[] = userDoc.tenantIds ?? [];
      tenantIds.push(newTenantDoc._id.toString());

      const updateDocument = {
        roles,
        tenantIds,
      };

      const updateQuery = { $set: updateDocument };
      const filter = { _id: userDoc._id };

      await db.collection(Collection.users).updateOne(filter, updateQuery);
    } else {
      // The user does not exist in the database. Create him.
      userDoc = {
        _id: new mongo.ObjectID(),
        email: adminEmail,
        roles: [UserRoleType.TENANT_ADMIN.toString()],
        tenantIds: [newTenantDoc._id.toString()],
      };

      await db.collection(Collection.users).insertOne(userDoc);
      newUserAdded = true;
    }
  }

  client.close();

  MongoDbStorage.cache.purgeQueryResult(Collection.tenants.toString());
  if (newUserAdded) {
    MongoDbStorage.cache.purgeQueryResult(Collection.users);
  }

  return newTenantDoc;
}

// #endregion AddTenant
