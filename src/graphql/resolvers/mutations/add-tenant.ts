import { ApolloServerContext } from '../../resolvers';
import { AddTenantInput, Tenant } from '../../types';

export async function addTenant(
  notUsed: unknown,
  args: { input: AddTenantInput },
  context: ApolloServerContext,
): Promise<Tenant> {
  return context.dataSources.genericApi.addTenant(args.input);
}
