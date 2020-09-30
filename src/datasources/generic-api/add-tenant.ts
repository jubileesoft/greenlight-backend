import { AddTenantInput, Tenant } from 'src/graphql/types';
import GenericApi from '../generic-api';

export async function AddTenant(this: GenericApi, input: AddTenantInput): Promise<Tenant> {
  const doc = await this.storage.addTenant(input);
  return this.storage.mapTenantDoc(doc);
}
