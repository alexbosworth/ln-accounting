# Versions

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
