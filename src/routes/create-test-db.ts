import { Application, Request, Response } from 'express';
import resolvers, { ApolloServerContext } from '../graphql/resolvers';
import GenericApi from '../datasources/generic-api';
import MongoDbStorage from '../datasources/mongodb/storage';
import { MicrosoftUser } from '@jubileesoft/amsel';
import { App, AddAppInput, Privilege, AddPrivilegeInput } from '..//graphql/types';

const removeNullsFromArray = function <T>(items: Array<T | null>): T[] {
  const resultArray: T[] = [];
  items.forEach((item) => {
    if (item != null) {
      resultArray.push(item);
    }
  });
  return resultArray;
};

const createApps = async (context: ApolloServerContext): Promise<App[]> => {
  const items: Array<App | null> = [];

  const a: AddAppInput = {
    name: 'Supercool App',
    owner: 'peter.lustig@wdr.de',
  };
  items.push(await resolvers.Mutation.addApp(null, { input: a }, context));

  return removeNullsFromArray<App>(items);
};

const createPrivileges = async (context: ApolloServerContext, apps: App[]): Promise<Privilege[]> => {
  const privileges: Array<Privilege | null> = [];

  const a: AddPrivilegeInput = {
    name: 'Create new project',
    short: 'BD.PC',
    tags: ['project'],
  };
  privileges.push(await resolvers.Mutation.addPrivilege(null, { appId: apps[0].id, input: a }, context));

  const b: AddPrivilegeInput = {
    name: 'Read Project GENERAL',
    short: 'BD.PG read',
    tags: ['project'],
  };
  privileges.push(await resolvers.Mutation.addPrivilege(null, { appId: apps[0].id, input: b }, context));

  const c: AddPrivilegeInput = {
    name: 'Write Project GENERAL',
    short: 'BD.PG write',
    tags: ['project'],
  };
  privileges.push(await resolvers.Mutation.addPrivilege(null, { appId: apps[0].id, input: c }, context));

  const d: AddPrivilegeInput = {
    name: 'Read Project OFFERS',
    short: 'BD.PO read',
    tags: ['project'],
  };
  privileges.push(await resolvers.Mutation.addPrivilege(null, { appId: apps[0].id, input: d }, context));

  const e: AddPrivilegeInput = {
    name: 'Write Project OFFERS',
    short: 'BD.PO write',
    tags: ['project'],
  };
  privileges.push(await resolvers.Mutation.addPrivilege(null, { appId: apps[0].id, input: e }, context));

  const f: AddPrivilegeInput = {
    name: 'Read Project ACCOUNTING(s)',
    short: 'BD.PA read',
    tags: ['project'],
  };
  privileges.push(await resolvers.Mutation.addPrivilege(null, { appId: apps[0].id, input: f }, context));

  const g: AddPrivilegeInput = {
    name: 'Write Project ACCOUNTING(s)',
    short: 'BD.PA write',
    tags: ['project'],
  };
  privileges.push(await resolvers.Mutation.addPrivilege(null, { appId: apps[0].id, input: g }, context));

  return removeNullsFromArray<Privilege>(privileges);
};

export default function (app: Application): void {
  app.get('/createtestdb', async (req: Request, res: Response) => {
    // CREATE FAKE USER
    const user: MicrosoftUser = {
      aio: 'not used',
      aud: 'not used',
      exp: 0,
      iat: 0,
      iss: 'not used',
      nbf: 0,
      nonce: 'not used',
      oid: 'not used',
      sub: 'not used',
      uti: 'not used',
      ver: 'not used',
    };

    // CREATE USABLE CONTEXT
    const context: ApolloServerContext = {
      user,
      dataSources: {
        genericApi: new GenericApi(new MongoDbStorage()),
      },
    };

    // CREATE APPS
    const apps = await createApps(context);

    // CREATE PRIVILEGES
    await createPrivileges(context, apps);

    res.send('OK');
  });
}
