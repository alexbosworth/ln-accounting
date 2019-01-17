const {lightningDaemon} = require('ln-service');

const {LNACCOUNTING_LND_CERT} = process.env;
const {LNACCOUNTING_LND_MACAROON} = process.env;
const {LNACCOUNTING_LND_SOCKET} = process.env;

/** Get the lnd connection

  {}

  @returns
  {
    lnd: <LND GRPC API Object>
  }
*/
module.exports = ({}) => {
  return {
    lnd: lightningDaemon({
      cert: LNACCOUNTING_LND_CERT,
      macaroon: LNACCOUNTING_LND_MACAROON,
      socket: LNACCOUNTING_LND_SOCKET,
    }),
  };
};
