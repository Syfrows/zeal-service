import gql from "graphql-tag";

export const shopApiExtensions = gql`
  extend type Query {
    productsByCollection(slug: String): Collection
    authenticatedUser: Customer
    activeOrderCustom: Order
  }
`;
