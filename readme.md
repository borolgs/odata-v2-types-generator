# oData V2 Types Generator

Generate types from OData V2 metadata.

## Usage

```bash
pnpm i -D odata-v2-types-generator
```

```ts
import { createTypesFromMetadata } from 'odata-v2-types-generator';
import { request } from 'undici';

const { body } = await request('https://services.odata.org/OData/OData.svc/$metadata', { method: 'GET' });
const xml = await body.text();

const tsSource = createTypesFromMetadata(xml);
```

### Options

```ts
const tsSource = createTypesFromMetadata(xml, {
  onCreateEntity: (typeAlias, { metadata, entity }) => {
    ts.addSyntheticLeadingComment(
      typeAlias,
      ts.SyntaxKind.MultiLineCommentTrivia,
      `*\n* ${metadata.schema.Namespace}.${entity.Name}\n`,
      true,
    );
  },
  onCreateEntityProperty: (propertySignature, { metadata, entity, property }) => {},
  onCreateComplexType: (typeAlias, { metadata, complexType }) => {},
  onCreateComplexTypeProperty: (propertySignature, { metadata, complexType, property }) => {},
});
```

Output:

```ts
/**
 * ServiceName.EntityName
 */
export type EntityName = {
  Id: string;
  Name: string;
};
```

## References

- https://ts-ast-viewer.com/
- https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API
- https://github.com/horiuchi/dtsgenerator
- https://sapui5.hana.ondemand.com/1.36.6/docs/guide/341823349ed04df1813197f2a0d71db2.html
