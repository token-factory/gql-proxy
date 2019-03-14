const {
    makeRemoteExecutableSchema,
    introspectSchema,
    mergeSchemas
} = require('graphql-tools');
const { createHttpLink } = require('apollo-link-http');
const { setContext } = require('apollo-link-context');
const { ApolloServer } = require('apollo-server-express');
const fetch = require('node-fetch');
const log4js = require('log4js');
const logger = log4js.getLogger('server.js');
logger.level = process.env.LOG_LEVEL || 'debug';
const express = require('express');

const app = express();
const _ = require('lodash');

const ACCOUNT_URI =
  process.env.BASE_URI || 'http://token-factory-account-service:4001'; // override for not in K8
const REGISTRATION_URI =
  process.env.BASE_URI || 'http://token-factory-registration-service:4000'; // override for not in K8
const STELLAR_NODE_URI = 'https://core-test.gly.sh/graphql'
let schema = false;

// graphql API metadata
const graphqlApis = [
    {
        uri: STELLAR_NODE_URI       //Token Factory APIs will override this default set
    },
    {
        uri: ACCOUNT_URI + '/account'
    },
    {
        uri: REGISTRATION_URI + '/registration'
    }
];

// authenticate for schema usage
const context = ({ req }) => {
    return { req };
};

// create executable schemas from remote GraphQL APIs
const createRemoteExecutableSchemas = async () => {
    let schemas = [];
    for (const api of graphqlApis) {
        const http = new createHttpLink({ uri: api.uri, fetch });

        const link = setContext((request, previousContext) => {
            return {
                headers: {
                    authorization: previousContext.graphqlContext
                        ? previousContext.graphqlContext.req.headers.authorization
                        : ''
                }
            };
        }).concat(http);

        const remoteSchema = await introspectSchema(link);
        const remoteExecutableSchema = makeRemoteExecutableSchema({
            schema: remoteSchema,
            link
        });
        schemas.push(remoteExecutableSchema);
    }
    return schemas;
};

const createNewSchema = async () => {
    const schemas = await createRemoteExecutableSchemas();
    if (!schemas) {
        return false;
    } else {
        return mergeSchemas({
            schemas
        });
    }
};

const port = 3001;
const path = '/token-factory';
app.path = path;

//Kub8 health check
app.get('/readiness', async function(req, res) {
    try {
        schema = await createNewSchema();
        if (schema) {
            const server = await new ApolloServer({ schema });
            server.applyMiddleware({ app, path });
            res.status(200).json({
                message: 'Graphql service is ready. All services are connected'
            });
        } else {
            res
                .status(500)
                .json({ err: 'Graphql service not ready. Waiting on services' });
        }
    } catch (error) {
        console.log('error', error);
        res.status(500).json({ err: 'Graphql service is unreachable' });
    }
});

app.get('/liveness', async function(req, res) {
    try {
        const tmpSchema = await createNewSchema();
        if (tmpSchema && _.differenceBy(tmpSchema, schema).length === 0) {
            res.status(200).json({
                message:
          'Graphql service is alive and no changes to schema have occurred'
            });
        } else {
            res.status(500).json({ err: 'Graphql schema has changed.' });
        }
    } catch (error) {
        console.log('error', error);
        res.status(500).json({ err: 'Graphql service is unreachable' });
    }
});

const startServer = async () => {
    app.listen({ port: port }, () => {
        logger.info(`App listening on <hostname>:${port}${app.path}!`);
    });

    try {
        schema = await createNewSchema();
        if (schema) {
            const server = new ApolloServer({
                schema,
                context: context
            });
            logger.info('schema merged', schema);
            server.applyMiddleware({ app, path });
        }
    } catch (error) {
        logger.info(
            'Failed to create schema during startup.  Defer to K8 probes',
            error
        );
    }
};

startServer();
