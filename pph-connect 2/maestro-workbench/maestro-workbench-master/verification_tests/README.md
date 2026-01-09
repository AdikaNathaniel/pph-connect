# Verification Tests Directory

This directory contains temporary verification scripts used to test the messaging system implementation.

## Contents

- `verify_schema.js` - Schema verification script (checks tables, functions, storage buckets)
- `test_enum_values.sql` - SQL script to check enum values
- Additional test scripts as needed

## Usage

Run the main verification:
```bash
deno run --allow-net verify_schema.js
```

## Cleanup

This entire directory can be safely deleted after verification is complete:
```bash
rm -rf verification_tests/
```
