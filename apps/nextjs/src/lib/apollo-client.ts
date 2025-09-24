/* eslint-disable @typescript-eslint/prefer-optional-chain */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import {
  ApolloClient,
  InMemoryCache,
  ApolloLink,
  Observable,
} from "@apollo/client";
import mondaySdk from "monday-sdk-js";
import { APIOptions } from "monday-sdk-js/types/client-api.interface";
// Initialize the Monday SDK
const monday = mondaySdk();

const mondayLink = new ApolloLink((operation) => {
  return new Observable((observer) => {
    const { query, variables } = operation;
    const graphqlQuery = {
      query: query.loc && query.loc.source.body,
      variables,
    };
    if (graphqlQuery.query) {
      monday
        .api(graphqlQuery.query, {
          variables: graphqlQuery.variables,
          token: process.env.MONDAY_TOKEN,
        })
        .then((response) => {
          observer.next(response);
          observer.complete();
        })
        .catch((error) => observer.error(error));
    }
  });
});

const createApolloClient = () => {
  return new ApolloClient({
    link: mondayLink,
    cache: new InMemoryCache(),
  });
};

export default createApolloClient;
