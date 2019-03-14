# Token Factory GQL proxy

The GraphQL proxy service Token Factory. This is the GraphQL entry endpoint for the the various GraphQL micro services in Token Factory.

## Background
`gql-proxy` is a stand alone micro-service which unites 3 services: account services(account-service), registration services(registration-service) and stellar node services(core-test.gly.sh)


### Start server
To run this program, NPM install the various dependencies and start the server.  

```
npm install; npm run build; npm run start:dev
```

## Testing
Currently this micro service does not have tests

