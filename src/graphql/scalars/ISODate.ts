import { Kind, ValueNode } from 'graphql/language';
import { GraphQLScalarType } from 'graphql';
import { returnOnError } from '../../helpers';

function serialize(value: Date): string | null {
  return value instanceof Date ? value.toISOString() : null;
}

function parseValue(value: string | null): Date | null {
  return returnOnError(() => (value == null ? null : new Date(value)), null);
}

function parseLiteral(ast: ValueNode): Date | null {
  return ast.kind === Kind.STRING ? parseValue(ast.value) : null;
}

export default new GraphQLScalarType({
  name: 'ISODate',
  description: 'JavaScript Date object as an ISO timestamp',
  serialize,
  parseValue,
  parseLiteral,
});
