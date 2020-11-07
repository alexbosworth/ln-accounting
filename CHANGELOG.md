# Versions

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
