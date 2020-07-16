// eslint-disable-next-line @typescript-eslint/no-var-requires
const { gql } = require('apollo-server-express');

const typeDefs = gql`
  type ObjectPool {
    id: ID!
    appId: ID!
    name: String!
    short: String
    tags: [String]
    objects: [Object]
  }
`;

export default typeDefs;
