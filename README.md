# stitch

A CLI to assist in the migration to the Embroider build system. Stitch will help you bring
the pieces of Embroider together to ensure your project can move to it successfully.

## Usage

Embroider can run some initial checks to determine if your project is currently compatible.

```shell
# Runs the Embroider preflight checks
npx stitch preflight
```

Embroider can additionally run some migrations for you to onboard you faster.

```shell
# Runs the Embroider migrations
npx stitch migrate
```
