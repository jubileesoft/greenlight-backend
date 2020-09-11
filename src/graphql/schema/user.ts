// eslint-disable-next-line @typescript-eslint/no-var-requires
const { gql } = require('apollo-server-express');

const typeDefs = gql`
  enum UserRoleTypeEnum {
    ADMIN
    TENANT_ADMIN
    APP_ADMIN
  }

  type UserRole {
    type: UserRoleTypeEnum!
    ids: [String]
  }

  type User {
    id: ID!
    email: String!
    roles: [UserRole]
  }

  extend type Query {
    getMe: User
  }
`;

export default typeDefs;
