# LND Harmony Accounting

Show LN sends and receives in [Harmony](https://github.com/harmony-csv/harmony)
format

[![npm version](https://badge.fury.io/js/ln-accounting.svg)](https://badge.fury.io/js/ln-accounting)
[![Coverage Status](https://coveralls.io/repos/github/alexbosworth/ln-accounting/badge.svg?branch=master)](https://coveralls.io/github/alexbosworth/ln-accounting?branch=master)
[![Build Status](https://travis-ci.org/alexbosworth/ln-accounting.svg?branch=master)](https://travis-ci.org/alexbosworth/ln-accounting)

## getAccountingReport

Get an accounting summary of wallet

Note: The `lightning_fees` category is a view of the routing fees paid on
payments, it is only populated when it is specified as the category filter

Note: `request` is required to look up fiat rates when `fiat` is specified and
no `rate` function is given

    {
      [after]: <Records Created On or After ISO 8601 Date>
      [before]: <Records Created Before ISO 8601 Date>
      [category]: <Category Filter String>
      currency: <Base Currency Type String>
      [fiat]: <Fiat Currency Type String>
      lnd: <Authenticated LND gRPC API Object>
      [network]: <Network Name String>
      [rate]: <Exchange Function> ({currency, date, fiat}, cbk) => (err, {cents})
      [rate_provider]: <Fiat Rate Provider String> coindesk || coingecko
      [request]: <Request Function>
      [transactions]: [<Raw Transaction Hex String>]
    }

    @returns via cbk or Promise
    {
      [chain_fees]: [{
        [amount]: <Amount Number>
        [asset]: <Asset Type String>
        [created_at]: <ISO 8601 Date String>
        [external_id]: <External Reference Id String>
        [from_id]: <Source Id String>
        [id]: <Record Id String>
        [notes]: <Notes String>
        [to_id]: <Destination Id String>
        [type]: <Record Type String>
      }]
      [chain_fees_csv]: <CSV String>
      [chain_sends]: [{
        [amount]: <Amount Number>
        [asset]: <Asset Type String>
        [created_at]: <ISO 8601 Date String>
        [external_id]: <External Reference Id String>
        [from_id]: <Source Id String>
        [id]: <Record Id String>
        [notes]: <Notes String>
        [to_id]: <Destination Id String>
        [type]: <Record Type String>
      }]
      [chain_sends_csv]: <CSV String>
      [forwards]: [{
        [amount]: <Amount Number>
        [asset]: <Asset Type String>
        [created_at]: <ISO 8601 Date String>
        [external_id]: <External Reference Id String>
        [from_id]: <Source Id String>
        [id]: <Record Id String>
        [notes]: <Notes String>
        [to_id]: <Destination Id String>
        [type]: <Record Type String>
      }]
      [forwards_csv]: <CSV String>
      [invoices]: [{
        [amount]: <Amount Number>
        [asset]: <Asset Type String>
        [created_at]: <ISO 8601 Date String>
        [external_id]: <External Reference Id String>
        [from_id]: <Source Id String>
        [id]: <Record Id String>
        [notes]: <Notes String>
        [to_id]: <Destination Id String>
        [type]: <Record Type String>
      }]
      [invoices_csv]: <CSV String>
      [lightning_fees]: [{
        [amount]: <Amount Number>
        [asset]: <Asset Type String>
        [created_at]: <ISO 8601 Date String>
        [external_id]: <External Reference Id String>
        [from_id]: <Source Id String>
        [id]: <Record Id String>
        [notes]: <Notes String>
        [to_id]: <Destination Id String>
        [type]: <Record Type String>
      }]
      [lightning_fees_csv]: <CSV String>
      [payments]: [{
        [amount]: <Amount Number>
        [asset]: <Asset Type String>
        [created_at]: <ISO 8601 Date String>
        [external_id]: <External Reference Id String>
        [from_id]: <Source Id String>
        [id]: <Record Id String>
        [notes]: <Notes String>
        [to_id]: <Destination Id String>
        [type]: <Record Type String>
      }]
      [payments_csv]: <CSV String>
    }

## getChainTransactions

Get chain transactions, including sweep fees

    {
      [after]: <Records Created On or After ISO 8601 Date>
      [before]: <Records Created Before ISO 8601 Date>
      lnd: <Authenticated LND Object>
      [network]: <Network Name String>
      [transactions]: [<Raw Transaction Hex String>]
    }

    @returns via cbk or Promise
    {
      transactions: [{
        [block_id]: <Block Id Hex String>
        [confirmation_count]: <Confirmation Count Number>
        [confirmation_height]: <Confirmation Block Height Number>
        created_at: <Created ISO 8601 Date String>
        [description]: <Transaction Label String>
        [fee]: <Fees Paid Tokens Number>
        id: <Transaction Id String>
        is_confirmed: <Is Confirmed Bool>
        is_outgoing: <Transaction Outbound Bool>
        output_addresses: [<Address String>]
        tokens: <Tokens Including Fee Number>
        [transaction]: <Raw Transaction Hex String>
      }]
    }

## harmonize

Convert accounting records into a Harmony format CSV

    {
      records: [{
        [amount]: <Amount Number>
        [asset]: <Asset Type String>
        [created_at]: <ISO 8601 Date String>
        [external_id]: <External Reference Id String>
        [fiat_amount]: <Fiat Amount Number>
        [from_id]: <Source Id String>
        [id]: <Record Id String>
        [notes]: <Notes String>
        [to_id]: <Destination Id String>
        [type]: <Record Type String>
      }]
    }

    @throws
    <Error>

    @returns
    {
      csv: <Harmony Format CSV String>
    }

## parseAmount

Parse a described amount into tokens

    {
      amount: <Amount String>
      [variables]: {
        <Name String>: <Amount Number>
      }
    }

    @throws
    <Error>

    @returns
    {
      tokens: <Tokens Number>
    }

## rateProviders

Rate provider source options

    [<Rate Provider Name String>]

Constants:

    [<Rate Provider Name String>]
