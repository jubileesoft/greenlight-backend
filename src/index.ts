// eslint-disable-next-line @typescript-eslint/no-var-requires
const { ApolloServer } = require('apollo-server-express');
import amsel, { MicrosoftConfig, GoogleConfig } from '@jubileesoft/amsel';
import express from 'express';

import routes from './routes';

import GenericApi from './datasources/generic-api';
import MongoDbStorage from './datasources/mongodb/storage';
import resolvers from './graphql/resolvers';
import typeDefs from './graphql/type-defs';

import { config } from 'dotenv';

config();

const port = process.env.PORT || 3000;
const app = express();

// #region ROUTES

routes(app);

app.get('/', function (req, res) {
  res.send('Hello World!');
});

// #endregion ROUTES

// #region GRAPHQL

const googleConfig: GoogleConfig = {
  appClientId: process.env.GOOGLE_API_KEY as string,
};
amsel.initializeGoogle(googleConfig);

const microsoftConfig: MicrosoftConfig = {
  appId: process.env.MICROSOFT_CLIENT_ID as string,
  tenantId: process.env.MICROSOFT_TENANT_ID as string,
};
amsel.initializeMicrosoft(microsoftConfig);

const server = new ApolloServer({
  playground: true,
  typeDefs,
  resolvers,
  engine: {
    apiKey: process.env.APOLLOSERVER_ENGINE_APIKEY,
  },
  context: async (input: any): Promise<object> => {
    const notAuthenticated = { user: null };
    try {
      let user = null;

      if (typeof input.req.headers.xauthprovider === 'undefined') {
        return notAuthenticated;
      }

      if (input.req.headers.xauthprovider === 'google') {
        user = await amsel.verifyAccessTokenFromGoogle(input.req.headers.authorization);
      } else {
        user = await amsel.verifyAccessTokenFromMicrosoft(input.req.headers.authorization);
      }

      return { user };
    } catch (e) {
      console.log(e);
      return notAuthenticated;
    }
  },
  dataSources: (): object => {
    return { genericApi: new GenericApi(new MongoDbStorage()) };
  },
});

server.applyMiddleware({ app });

// #endregion GRAPHQL

// Start the server
app.listen(port, () => {
  console.log('Go to http://localhost:3000');
});
