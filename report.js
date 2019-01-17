#!/usr/bin/env node
const config = require('dotenv').config();
const {getAccountingReport} = require('ln-service');
const {getBorderCharacters} = require('table');
const prog = require('caporal');
const {table} = require('table');

const {getLnd} = require('./lightning');
const {version} = require('./package');

const currency = 'BTC';
const fiat = 'USD';

const categories = {
  'chain-fees': 'chain_fees',
  'chain-sends': 'chain_sends',
  'forwards': 'forwards',
  'invoices': 'invoices',
  'payments': 'payments',
};

prog
  .version(version)
  .command('get', 'Get harmony report')
  .argument('<category>', 'Report category', Object.keys(categories))
  .option('--csv', 'Output a CSV')
  .action((args, options, logger) => {
    const {lnd} = getLnd({});

    return new Promise((resolve, reject) => {
      return getAccountingReport({currency, fiat, lnd}, (err, res) => {
        if (!!err) {
          return reject(err);
        }

        const csvType = `${categories[args.category]}_csv`;

        if (!!options.csv) {
          return logger.info(res[csvType]);
        }

        const rows = res[csvType].split('\n').map(n => {
          return n.split(',').map(val => {
            if (val[0] === '"') {
              return val.slice(1, -1).slice(0, 32);
            }

            return parseInt(val, 10).toFixed(4);
          });
        });

        const records = table(rows, {border: getBorderCharacters('norc')});

        logger.info(records);

        return resolve();
      })
    });
  });
 
prog.parse(process.argv);