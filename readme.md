# odata-v2-types

Generate types from OData V2 metadata.

## Usage

```bash
git clone git@github.com:borolgs/odata-v2-types.git
npm i -g pnpm
pnpm i

pnpm run test
pnpm run build
```

```ts
import { createTypesFromMetadata } from 'odata-v2-types';
import { request } from 'undici';

const { body } = await request('https://services.odata.org/OData/OData.svc/$metadata', { method: 'GET' });
const xml = await body.text();

const tsSource = createTypesFromMetadata(xml);
```

## References

- https://ts-ast-viewer.com/
- https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API
- https://github.com/horiuchi/dtsgenerator
- https://sapui5.hana.ondemand.com/1.36.6/docs/guide/341823349ed04df1813197f2a0d71db2.html
