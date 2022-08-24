import ts from 'typescript';
import { createComplexTypeAliasDeclaration, createEntityTypeAliasDeclaration } from './create-types';
import { MetadataWrapper } from './metadata-wrapper';
import { ComplexType, EntityType } from './odata-v2-types';

const printer = ts.createPrinter();
const print = (node: ts.Node) => {
  const resultFile = ts.createSourceFile('someFileName.ts', '', ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
  const source = printer.printNode(ts.EmitHint.Unspecified, node, resultFile);
  return source;
};

describe('create-types', () => {
  it('createComplexTypeAliasDeclaration() create complex type from metadata', () => {
    const complexTypeInfo: ComplexType = {
      Name: 'SomeComplexType',
      Property: [
        { Name: 'A', Type: 'Edm.String' },
        { Name: 'B', Type: 'Edm.Int32' },
        { Name: 'C', Type: 'Edm.DateTime', Nullable: true },
      ],
    };

    const typeAliasDeclaration = createComplexTypeAliasDeclaration(complexTypeInfo);
    const source = print(typeAliasDeclaration);

    const expected = `/** Complex Type */
export type SomeComplexType = {
    A: string;
    /** Int32 */
    B: number;
    /** DateTime */
    C?: Date;
};`;

    expect(source).toBe(expected);
  });

  it('createEntityTypeAliasDeclaration() create simple enitity type from metadata', () => {
    const entityTypeInfo: EntityType = {
      Name: 'SomeEntityType',
      Key: { PropertyRef: { Name: 'Id' } },
      Property: [
        { Name: 'Id', Type: 'Edm.Int32' },
        { Name: 'A', Type: 'Edm.String' },
        { Name: 'B', Type: 'Edm.DateTime', Nullable: true },
      ],
    };
    const metadata = new MetadataWrapper({
      Namespace: 'SomeNamespace',
      EntityType: [entityTypeInfo],
      ComplexType: [],
      Association: [],
    });

    const typeAliasDeclaration = createEntityTypeAliasDeclaration(entityTypeInfo, metadata);
    const source = print(typeAliasDeclaration);

    const expected = `/** Entity */
export type SomeEntityType = {
    /** Int32 */
    Id: number;
    A: string;
    /** DateTime */
    B?: Date;
};`;

    expect(source).toBe(expected);
  });

  it('createEntityTypeAliasDeclaration() create enitity type with 1..1 navigation property', () => {
    const entityTypeInfo: EntityType = {
      Name: 'SomeEntityType',
      Key: { PropertyRef: { Name: 'Id' } },
      Property: [{ Name: 'Id', Type: 'Edm.Int32' }],
      NavigationProperty: [
        { Name: 'A', Relationship: 'SomeNamespace.SomeEntityType_A_S_AnotherEntityType', FromRole: '', ToRole: '' },
      ],
    };
    const metadata = new MetadataWrapper({
      Namespace: 'SomeNamespace',
      EntityType: [
        entityTypeInfo,
        {
          Name: 'AnotherEntityType',
          Key: { PropertyRef: { Name: 'Id' } },
          Property: [{ Name: 'Id', Type: 'Edm.Int32' }],
          NavigationProperty: [
            { Name: 'S', Relationship: 'SomeNamespace.SomeEntityType_A_S_AnotherEntityType', FromRole: '', ToRole: '' },
          ],
        },
      ],
      ComplexType: [],
      Association: [
        {
          Name: 'SomeEntityType_A_S_AnotherEntityType',
          End: [
            {
              Type: 'SomeNamespace.SomeEntityType',
              Multiplicity: '1',
              Role: 'SomeEntityType_A',
            },
            {
              Type: 'SomeNamespace.AnotherEntityType',
              Multiplicity: '1',
              Role: 'AnotherEntityType_S',
            },
          ],
        },
      ],
    });

    const typeAliasDeclaration = createEntityTypeAliasDeclaration(entityTypeInfo, metadata);
    const source = print(typeAliasDeclaration);

    const expected = `/** Entity */
export type SomeEntityType = {
    /** Int32 */
    Id: number;
    A?: AnotherEntityType;
};`;

    expect(source).toBe(expected);
  });

  it('createEntityTypeAliasDeclaration() create enitity type with 1..* navigation property', () => {
    const entityTypeInfo: EntityType = {
      Name: 'SomeEntityType',
      Key: { PropertyRef: { Name: 'Id' } },
      Property: [{ Name: 'Id', Type: 'Edm.Int32' }],
      NavigationProperty: [
        { Name: 'A', Relationship: 'SomeNamespace.SomeEntityType_A_S_AnotherEntityType', FromRole: '', ToRole: '' },
      ],
    };
    const metadata = new MetadataWrapper({
      Namespace: 'SomeNamespace',
      EntityType: [
        entityTypeInfo,
        {
          Name: 'AnotherEntityType',
          Key: { PropertyRef: { Name: 'Id' } },
          Property: [{ Name: 'Id', Type: 'Edm.Int32' }],
          NavigationProperty: [
            { Name: 'S', Relationship: 'SomeNamespace.SomeEntityType_A_S_AnotherEntityType', FromRole: '', ToRole: '' },
          ],
        },
      ],
      ComplexType: [],
      Association: [
        {
          Name: 'SomeEntityType_A_S_AnotherEntityType',
          End: [
            {
              Type: 'SomeNamespace.SomeEntityType',
              Multiplicity: '1',
              Role: 'SomeEntityType_A',
            },
            {
              Type: 'SomeNamespace.AnotherEntityType',
              Multiplicity: '*',
              Role: 'AnotherEntityType_S',
            },
          ],
        },
      ],
    });

    const typeAliasDeclaration = createEntityTypeAliasDeclaration(entityTypeInfo, metadata);
    const source = print(typeAliasDeclaration);

    const expected = `/** Entity */
export type SomeEntityType = {
    /** Int32 */
    Id: number;
    A?: {
        results: AnotherEntityType[];
    };
};`;

    expect(source).toBe(expected);
  });
});
