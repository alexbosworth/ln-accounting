# Versions

## Version 5.0.7

- `getChainTransactions`: Add mempool space tx data lookup method

## Version 5.0.2

- `getChainTransactions`: Optimize lookup speed when an after date is specified

## Version 5.0.1

- `getAccountingReport`: Adjust sweeps to be net zero for transacted amount, plus fees

## Version 5.0.0

- `getAccountingReport`: Add support for coingecko historic rate lookup, use as default

### Breaking Changes

- Node.js version 12 or higher is now required

## Version 4.3.1

- `getAccountingReport`: Fix reporting for AMP push invoices

## Version 4.3.0

- `getAccountingReport`: Remove requirement to get fiat conversions for records

## Version 4.2.8

- `getAccountingReport`: Fix chain transaction costs calculation when local data is absent

## Version 4.2.4

- `getAccountingReport`: Add `network` argument to support testnet accounting
- `getAccountingReport`: Add tx chain description notes to chain records
- `getAccountingReport`: Include "from public key" tag in received push payments

## Version 4.2.3

- `getAccountingReport`: Populate close channel fees in chain fees report
- `getChainTransactions`: Include closed channel transactions with paid fees in output

## Version 4.2.2

- `getAccountingReport`: Populate sweep fees in chain fees report
- `getChainTransactions`: Add method to derive chain tx with filled-in sweep fees

## Version 4.1.13

- `getAccountingReport`: Add paging support to payments fetching

## Version 4.1.10

- `getAccountingReport`: Fix issue mapping chain receives to records

## Version 4.1.8

-  `getAccountingReport`: Detect an additional format of submarine swap
-  `getAccountingReport`: Change default rate provider to coincap

## Version 4.1.7

- `getAccountingReport`: fix async control flow dependency

## Version 4.1.5

- `getAccountingReport`: rework invoices and payments to show circular payments
- `getAccountingReport`: change the formatting of invoice notes to be more terse

## Version 4.0.0

- `getAccountingReport`: A request func (like @alexbosworth/request) is required

### Breaking Changes

The HTTP request function must be externally provided to get an accounting
report.

## Version 3.1.9

- `getAccountingReport`: Add `after` and `before` arguments to specify range of
    results
