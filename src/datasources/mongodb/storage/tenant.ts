import { existedOperationTypeMessage } from 'graphql/validation/rules/UniqueOperationTypes';
import mongo from 'mongodb';
import { AddTenantInput, Collection, Tenant } from '../../../graphql/types';
import { TenantDoc } from '../docs';
import MongoDbStorage, { Query as StorageQuery } from '../storage';

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

  // TODO Create TENANT

  client.close();
}

// #endregion AddTenant
