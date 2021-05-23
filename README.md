# stitch

<img align="left" alt="stitch" width="100" height="100" src="https://user-images.githubusercontent.com/180990/119271812-fd6b2980-bbb7-11eb-94df-1b85a5c77733.png">
A CLI to assist in the migration to the Embroider build system. Stitch will help you bring
the pieces of Embroider together to ensure your project can move to it successfully.
<br>
<br>
<br>

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
