import { IResolvers } from 'graphql-tools';
import { AuthenticationError } from 'apollo-server-express';
import { MicrosoftUser } from '@jubileesoft/amsel';
import GenericApi from '../datasources/generic-api';
import {
  Collection,
  AddAppUserInput,
  AddAppInput,
  AddPrivilegeInput,
  UpdatePrivilegeInput,
  AddPrivilegePoolInput,
  UserRoleType,
  UserRole,
  Tenant,
  AddTenantInput,
} from './types';
import { User, App, AppUser, Privilege, PrivilegePool } from './types';
import ISODate from './scalars/ISODate';
import { JFilter } from 'src/index.dt';
import { addTenant } from './resolvers/mutations/add-tenant';

export interface ApolloServerContext {
  user: MicrosoftUser;
  dataSources: { genericApi: GenericApi };
}

interface AmselResolvers extends IResolvers {
  // Query: {
  //   getMe(notUsed1: unknown, notUsed2: unknown, context: ApolloServerContext): Promise<User | null>;
  // };
  Mutation: {
    addTenant(notUsed: unknown, args: { input: AddTenantInput }, context: ApolloServerContext): Promise<Tenant>;
    addApp(notUsed: unknown, args: { input: AddAppInput }, context: ApolloServerContext): Promise<App | null>;
    createAppApiKey1(notUsed: unknown, args: { appId: string }, context: ApolloServerContext): Promise<string | null>;
    addAppUser(
      notUsed: unknown,
      args: { appId: string; input: AddAppUserInput },
      context: ApolloServerContext,
    ): Promise<AppUser | null>;
    addPrivilege(
      notUsed: unknown,
      args: { appId: string; input: AddPrivilegeInput },
      context: ApolloServerContext,
    ): Promise<Privilege | null>;
    updatePrivilege(
      notUsed: unknown,
      args: { privilegeId: string; input: UpdatePrivilegeInput },
      context: ApolloServerContext,
    ): Promise<Privilege | null>;
    deletePrivilege(notUsed: unknown, args: { privilegeId: string }, context: ApolloServerContext): Promise<boolean>;
    orderUpPrivilege(
      notUsed: unknown,
      args: { privilegeId: string },
      context: ApolloServerContext,
    ): Promise<Privilege[] | null>;
    orderDownPrivilege(
      notUsed: unknown,
      args: { privilegeId: string },
      context: ApolloServerContext,
    ): Promise<Privilege[] | null>;
    addPrivilegePool(
      notUsed: unknown,
      args: { appId: string; input: AddPrivilegePoolInput },
      context: ApolloServerContext,
    ): Promise<PrivilegePool | null>;
    orderUpPrivilegePool(
      notUsed: unknown,
      args: { privilegePoolId: string },
      context: ApolloServerContext,
    ): Promise<PrivilegePool[] | null>;
    orderDownPrivilegePool(
      notUsed: unknown,
      args: { privilegePoolId: string },
      context: ApolloServerContext,
    ): Promise<PrivilegePool[] | null>;
  };
}

const ensureIsAuthenticated = (context: ApolloServerContext): void => {
  if (!context.user) {
    throw new AuthenticationError('Unauthenticated.');
  }
};

const ensureIsAuthenticatedAndAuthorized = async (context: ApolloServerContext): Promise<UserRole[]> => {
  ensureIsAuthenticated(context);

  // Make sure that at least all admin users are available
  await context.dataSources.genericApi.createAdminUsers();

  const users: User[] | null = await context.dataSources.genericApi.getCollection(Collection.users);
  if (!users) {
    // This should NOT happen. At least the global admin users should be available.
    throw new AuthenticationError('Unauthenticated.');
  }

  const authorizedUser: User | undefined = users.find((x) => x.email === context.user.email?.toLowerCase());

  if (!authorizedUser) {
    throw new AuthenticationError('Unauthenticated.');
  }

  return authorizedUser.roles;
};

const resolvers: AmselResolvers = {
  Query: {
    getMe: async (_, ___, context: ApolloServerContext): Promise<User | null> => {
      await ensureIsAuthenticatedAndAuthorized(context);

      const me: User | null = await context.dataSources.genericApi.getMe(context.user.email as string);
      return me;
    },

    getTenants: async (_, __, context: ApolloServerContext): Promise<Tenant[]> => {
      const roles: UserRole[] = await ensureIsAuthenticatedAndAuthorized(context);

      let jfilter: JFilter | undefined;

      const admin = roles.find((x) => x.type === UserRoleType.ADMIN);
      if (!admin) {
        // If the user is not a global ADMIN, check to what tenants the user has access to.
        const tenantAdmin = roles.find((x) => x.type === UserRoleType.TENANT_ADMIN);
        if (tenantAdmin) {
          jfilter = {
            or: {
              property: 'id',
              values: tenantAdmin.ids as string[],
            },
          };
        } else {
          // An APP_ADMIN is not allowed to load tenants here
          throw new Error('WHY?????');
        }
      }

      const tenants: Tenant[] = await context.dataSources.genericApi.getCollection(Collection.tenants, jfilter);
      return tenants;
    },

    isTenantNameTaken: async (_, args: { name: string }, context: ApolloServerContext): Promise<boolean> => {
      if (args.name.trim().length === 0) {
        return true; // an empty tenant name is not allowed
      }

      const tenants: Tenant[] | null = await context.dataSources.genericApi.getCollection(Collection.tenants);
      if (!tenants) {
        return false;
      }

      if (
        tenants.find((tenant) => {
          return tenant.name.toLowerCase() === args.name.toLowerCase().trim();
        })
      ) {
        return true;
      }
      return false;
    },

    getApps: async (_, ___, context: ApolloServerContext): Promise<App[] | null> => {
      ensureIsAuthenticated(context);
      const apps: App[] | null = await context.dataSources.genericApi.getCollection(Collection.apps);
      if (apps == null) {
        return null;
      }

      return apps.sort((a, b) => {
        const x = a.name.toLowerCase();
        const y = b.name.toLowerCase();
        if (x < y) {
          return -1;
        }

        if (x > y) {
          return 1;
        }
        return 0;
      });
    },
    getApp: async (_, args: { id: string }, context: ApolloServerContext): Promise<App | null> => {
      const jfilter: JFilter = {
        id: args.id,
      };

      const apps: App[] | null = await context.dataSources.genericApi.getCollection(Collection.apps, jfilter);
      if (apps == null || apps.length === 0) {
        return null;
      }

      return apps[0];
    },
    getAppUsers: async (_, args: { appId: string }, context: ApolloServerContext): Promise<AppUser[] | null> => {
      const appUsers: AppUser[] | null = await context.dataSources.genericApi.getAppUsers(args.appId);
      return appUsers;
    },

    getPrivileges: async (_, args: { appId?: string }, context: ApolloServerContext): Promise<Privilege[] | null> => {
      const privileges: Privilege[] | null = await context.dataSources.genericApi.getPrivileges(args.appId);
      if (!privileges) {
        return null;
      }
      return privileges.sort((x: Privilege, y: Privilege) => {
        if (x.order < y.order) {
          return -1;
        }

        if (x.order > y.order) {
          return 1;
        }
        return 0;
      });
    },
    getPrivilegePools: async (
      _,
      args: { appId: string },
      context: ApolloServerContext,
    ): Promise<PrivilegePool[] | null> => {
      const privilegePools: PrivilegePool[] | null = await context.dataSources.genericApi.getPrivilegePools(args.appId);
      return privilegePools;
    },
  },
  App: {
    async users(app: App, __, context: ApolloServerContext): Promise<AppUser[] | null> {
      return context.dataSources.genericApi.getAppUsers(app.id);
    },
  },
  AppUser: {
    async app(appUser: AppUser, __, context: ApolloServerContext): Promise<App | null> {
      return context.dataSources.genericApi.getAppFromAppUser(appUser.id);
    },
  },
  Privilege: {
    async app(privilege: Privilege, __, context: ApolloServerContext): Promise<App | null> {
      const app: App | null = await context.dataSources.genericApi.getAppFromPrivilege(privilege.id);
      return app;
    },
  },
  PrivilegePool: {
    async app(privilegePool: PrivilegePool, __, context: ApolloServerContext): Promise<App | null> {
      return context.dataSources.genericApi.getAppFromPrivilegePool(privilegePool.id);
    },
    async privileges(privilegePool: PrivilegePool, __, context: ApolloServerContext): Promise<Privilege[] | null> {
      return context.dataSources.genericApi.getPrivilegesFromPrivilegePool(privilegePool.id);
    },
  },
  Mutation: {
    addTenant,

    addApp: async (_, args: { input: AddAppInput }, context: ApolloServerContext): Promise<App | null> => {
      return context.dataSources.genericApi.addApp(args.input);
    },
    createAppApiKey1: async (_, args: { appId: string }, context: ApolloServerContext): Promise<string | null> => {
      return context.dataSources.genericApi.createAppApiKey1(args.appId);
    },
    addAppUser: async (
      _,
      args: { appId: string; input: AddAppUserInput },
      context: ApolloServerContext,
    ): Promise<AppUser | null> => {
      return context.dataSources.genericApi.addAppUser(args.appId, args.input);
    },

    addPrivilege: async (
      _,
      args: { appId: string; input: AddPrivilegeInput },
      context: ApolloServerContext,
    ): Promise<Privilege | null> => {
      return context.dataSources.genericApi.addPrivilege(args.appId, args.input);
    },

    updatePrivilege: async (
      _,
      args: { privilegeId: string; input: UpdatePrivilegeInput },
      context: ApolloServerContext,
    ): Promise<Privilege | null> => {
      return context.dataSources.genericApi.updatePrivilege(args.privilegeId, args.input);
    },

    deletePrivilege: async (_, args: { privilegeId: string }, context: ApolloServerContext): Promise<boolean> => {
      return context.dataSources.genericApi.deleteFromCollection(Collection.privileges, args.privilegeId);
    },

    orderUpPrivilege: async (
      _,
      args: { privilegeId: string },
      context: ApolloServerContext,
    ): Promise<Privilege[] | null> => {
      return context.dataSources.genericApi.orderUpPrivilege(args.privilegeId);
    },

    orderDownPrivilege: async (
      _,
      args: { privilegeId: string },
      context: ApolloServerContext,
    ): Promise<Privilege[] | null> => {
      return context.dataSources.genericApi.orderDownPrivilege(args.privilegeId);
    },

    addPrivilegePool: async (
      _,
      args: { appId: string; input: AddPrivilegePoolInput },
      context: ApolloServerContext,
    ): Promise<PrivilegePool | null> => {
      return context.dataSources.genericApi.addPrivilegePool(args.appId, args.input);
    },

    orderUpPrivilegePool: async (
      _,
      args: { privilegePoolId: string },
      context: ApolloServerContext,
    ): Promise<PrivilegePool[] | null> => {
      return context.dataSources.genericApi.orderUpPrivilegePool(args.privilegePoolId);
    },

    orderDownPrivilegePool: async (
      _,
      args: { privilegePoolId: string },
      context: ApolloServerContext,
    ): Promise<PrivilegePool[] | null> => {
      return context.dataSources.genericApi.orderDownPrivilegePool(args.privilegePoolId);
    },
  },
  // Scalars
  ISODate,
};

export default resolvers;
