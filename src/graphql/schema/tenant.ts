// eslint-disable-next-line @typescript-eslint/no-var-requires
const { gql } = require('apollo-server-express');

const typeDefs = gql`
  type Tenant {
    id: ID!
    name: String!
  }

  extend type Query {
    getTenants: [Tenant]
  }
`;

export default typeDefs;
