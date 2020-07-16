// eslint-disable-next-line @typescript-eslint/no-var-requires
const { gql } = require('apollo-server-express');

import appTypeDefs from './schema/app';
import objectPoolTypeDefs from './schema/object-pool';
import objectTypeDefs from './schema/object';
import privilegePoolTypeDefs from './schema/privilege-pool';
import privilegeTypeDefs from './schema/privilege';
import appUserTypeDefs from './schema/app-user';

const root = gql`
  scalar ISODate

  type Query {
    root: String
  }

  type Mutation {
    root: String
  }
`;

const typeDefs = [
  root,
  appTypeDefs,
  objectPoolTypeDefs,
  objectTypeDefs,
  privilegePoolTypeDefs,
  privilegeTypeDefs,
  appUserTypeDefs,
];

export default typeDefs;
