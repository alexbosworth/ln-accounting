# Harmony Accounting

Show LN sends and receives in Harmony format

## Configuration

```ini
GRPC_SSL_CIPHER_SUITES=HIGH+ECDSA
LNACCOUNTING_LND_CERT=BASE_64_CERT_FILE
LNACCOUNTING_LND_MACAROON=BASE_64_MACAROON_FILE
LNACCOUNTING_LND_SOCKET=LND_GRPC_IP:LND_GRPC_PORT
```

## Example Usage

Get forwarding records:

```
./lnaccounting get forwards
┌────────────┬───────┬──────────────────────────┬─────────────┬───────────────┬────────────┬───────┬─────────────────────────┬────────────────┬────────┐
│ Amount     │ Asset │ Date & Time              │ Fiat Amount │ From ID       │ Network ID │ Notes │ To ID                   │ Transaction ID │ Type   │
├────────────┼───────┼──────────────────────────┼─────────────┼───────────────┼────────────┼───────┼─────────────────────────┼────────────────┼────────┤
│ 1.0000     │ BTC   │ 2019-01-09T02:54:25.000Z │ 0.0000      │ 1x2x3         │            │       │ 2x3x4                   │                │ income │
└────────────┴───────┴──────────────────────────┴─────────────┴───────────────┴────────────┴───────┴─────────────────────────┴────────────────┴────────┘
```

See all options:

```
./lnaccounting --help
```
