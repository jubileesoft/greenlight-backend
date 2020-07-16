// eslint-disable-next-line @typescript-eslint/no-var-requires
const { gql } = require('apollo-server-express');

const typeDefs = gql`
  type App {
    id: ID!
    owner: String!
    name: String!
    apiKey1CreatedAt: ISODate
    users: [AppUser]
  }

  extend type Query {
    getApps: [App]
    getApp(id: String!): App
  }

  input AddAppInput {
    name: String!
    owner: String!
  }

  extend type Mutation {
    addApp(input: AddAppInput!): App
    createAppApiKey1(appId: String!): String
  }
`;

export default typeDefs;
