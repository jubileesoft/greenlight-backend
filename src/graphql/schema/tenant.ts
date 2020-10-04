// eslint-disable-next-line @typescript-eslint/no-var-requires
const { gql } = require('apollo-server-express');

const typeDefs = gql`
  type Tenant {
    id: ID!
    name: String!
    admins: [String!]!
  }

  input AddTenantInput {
    name: String!
    adminEmails: String!
  }

  extend type Query {
    getTenants: [Tenant]!
    isTenantNameTaken(name: String!): Boolean!
  }

  extend type Mutation {
    addTenant(input: AddTenantInput!): Tenant
  }
`;

export default typeDefs;
