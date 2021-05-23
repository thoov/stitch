# stitch

![CI Build](https://github.com/thoov/cli/workflows/CI%20Build/badge.svg)
![Volta Managed](https://img.shields.io/static/v1?label=volta&message=managed&color=yellow&logo=data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABmJLR0QAeQC6AMEpK7AhAAAACXBIWXMAAAsSAAALEgHS3X78AAAAB3RJTUUH5AMGFS07qAYEaAAAABl0RVh0Q29tbWVudABDcmVhdGVkIHdpdGggR0lNUFeBDhcAAAFmSURBVDjLY2CgB/g/j0H5/2wGW2xyTAQ1r2DQYOBgm8nwh+EY6TYvZtD7f9rn5e81fAGka17GYPL/esObP+dyj5Cs+edqZsv/V8o//H+z7P+XHarW+NSyoAv8WsFszyKTtoVBM5Tn7/Xys+zf7v76vYrJlPEvAwPjH0YGxp//3jGl/L8LU8+IrPnPUkY3ZomoDQwOpZwMv14zMHy8yMDwh4mB4Q8jA8OTgwz/L299wMDyx4Mp9f9NDAP+bWVwY3jGsJpB3JaDQVCEgYHlLwPDfwYWRqVQJgZmHoZ/+3PPfWP+68Mb/Pw5sqUoLni9ipuRnekrAwMjA8Ofb6K8/PKBF5nU7RX+Hize8Y2DOZTP7+kXogPy1zrH+f/vT/j/Z5nUvGcr5VhJioUf88UC/59L+/97gUgDyVH4YzqXxL8dOs/+zuFLJivd/53HseLPPHZPsjT/nsHi93cqozHZue7rLDYhUvUAADjCgneouzo/AAAAAElFTkSuQmCC&link=https://volta.sh)
![TypeScript](https://badgen.net/badge/icon/typescript?icon=typescript&label)
[![Code Style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](#badge)

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
