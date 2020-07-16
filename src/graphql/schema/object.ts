// eslint-disable-next-line @typescript-eslint/no-var-requires
const { gql } = require('apollo-server-express');

const typeDefs = gql`
  type Object {
    id: ID!
    appId: ID!
    offId: ID!
    name: String!
    short: String
    tags: [String]
  }
`;

export default typeDefs;
