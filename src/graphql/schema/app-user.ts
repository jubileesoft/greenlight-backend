// eslint-disable-next-line @typescript-eslint/no-var-requires
const { gql } = require('apollo-server-express');

const typeDefs = gql`
  type AppUser {
    id: ID!
    app: App!
    offId: ID!
    email: String!
    tags: [String]
  }

  extend type Query {
    getAppUsers(appId: String!): [AppUser]
  }

  input AddAppUserInput {
    offId: String!
    email: String!
    tags: [String]
  }

  extend type Mutation {
    addAppUser(appId: String!, input: AddAppUserInput!): AppUser
  }
`;

export default typeDefs;
