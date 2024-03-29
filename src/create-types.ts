import ts from 'typescript';
import * as OdataV2 from './odata-v2-types';
import { MetadataWrapper } from './metadata-wrapper';

export type GeneratorOptions = {
  onCreateEntityProperty?: (
    propertySignature: ts.PropertySignature,
    context: {
      metadata: MetadataWrapper;
      entity: OdataV2.EntityType;
      property: OdataV2.Property;
    },
  ) => void | ts.PropertySignature;
  onCreateEntity?: (
    typeAlias: ts.TypeAliasDeclaration,
    context: {
      metadata: MetadataWrapper;
      entity: OdataV2.EntityType;
    },
  ) => void | ts.TypeAliasDeclaration;
  onCreateComplexTypeProperty?: (
    propertySignature: ts.PropertySignature,
    context: {
      metadata: MetadataWrapper;
      complexType: OdataV2.ComplexType;
      property: OdataV2.Property;
    },
  ) => void | ts.PropertySignature;
  onCreateComplexType?: (
    typeAlias: ts.TypeAliasDeclaration,
    context: {
      metadata: MetadataWrapper;
      complexType: OdataV2.ComplexType;
    },
  ) => void | ts.TypeAliasDeclaration;
};

export function createTypesFromMetadata(xml: string, options: GeneratorOptions = {}): string {
  const metadataWrapper = MetadataWrapper.fromString(xml);
  return createSource(metadataWrapper, options);
}

export function createSource(metadata: MetadataWrapper, options: GeneratorOptions): string {
  const tsFile = ts.createSourceFile('_.ts', '', ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
  const statements: ts.Statement[] = [];

  for (const complexType of metadata.complexTypes) {
    const typeAlias = createComplexTypeAliasDeclaration(complexType, metadata, options);
    statements.push(typeAlias);
  }

  for (const entity of metadata.entityTypes) {
    const typeAlias = createEntityTypeAliasDeclaration(entity, metadata, options);
    statements.push(typeAlias);
  }

  Object.assign(tsFile, {
    statements: ts.factory.createNodeArray(statements),
  });

  const result = ts.transform(tsFile, []);
  const transformedNodes = result.transformed[0];

  const printer = ts.createPrinter();
  const source = printer.printNode(ts.EmitHint.SourceFile, transformedNodes, tsFile);

  const description = `/**\n* ${metadata.schema.Namespace} API\n* This types are auto generated by oData2 Types Generator.\n* Do not edit the file manually.\n*/\n\n`;
  return description + source;
}

export function createComplexTypeAliasDeclaration(
  complexType: OdataV2.ComplexType,
  metadata: MetadataWrapper,
  options: GeneratorOptions = {},
) {
  const properties: ts.TypeElement[] = [];

  for (const property of complexType.Property ?? []) {
    if (!OdataV2.isPrimitive(property.Type)) {
      throw new Error(`Not implemented complex type property: ${property.Type}`);
    }

    let propertySignature = createPropertySignature(property.Name, toTSType(property.Type), !!property.Nullable);

    propertySignature =
      options.onCreateComplexTypeProperty?.(propertySignature, { metadata, complexType, property }) ??
      propertySignature;

    properties.push(propertySignature);
  }

  let typeAlias = createTypeAliasDeclaration(complexType.Name, properties);

  typeAlias = options.onCreateComplexType?.(typeAlias, { metadata, complexType }) ?? typeAlias;

  return typeAlias;
}

export function createEntityTypeAliasDeclaration(
  entity: OdataV2.EntityType,
  metadata: MetadataWrapper,
  options: GeneratorOptions = {},
) {
  const properties: ts.TypeElement[] = [];

  for (const property of entity.Property ?? []) {
    let propertySignature: ts.PropertySignature | null;
    if (property.Type.startsWith('Edm')) {
      if (OdataV2.isPrimitive(property.Type)) {
        propertySignature = createPropertySignature(property.Name, toTSType(property.Type), !!property.Nullable);
      } else {
        // TODO: handle other Edm types
        continue;
      }
    } else {
      const complexTypeName = property.Type.split('.')[1]; // Drop namespace
      const propertyType = ts.factory.createTypeReferenceNode(ts.factory.createIdentifier(complexTypeName), undefined);
      propertySignature = createPropertySignature(property.Name, propertyType, !!property.Nullable);
    }

    propertySignature =
      options.onCreateEntityProperty?.(propertySignature, { metadata, entity, property }) ?? propertySignature;

    if (propertySignature) {
      properties.push(propertySignature);
    }
  }
  if (entity.NavigationProperty) {
    for (const navigation of entity.NavigationProperty) {
      const association = metadata.getAssociation(navigation.Relationship);

      // TODO
      const toEntityEnd = association.End.filter((end) => !end.Type.endsWith(`.${entity.Name}`))[0];

      const toEntityName = toEntityEnd.Type.split('.')[1]; // Drop namespace
      const isArray = toEntityEnd.Multiplicity === '*';

      const refIdentifier = ts.factory.createIdentifier(toEntityName);
      const refTypeNode = ts.factory.createTypeReferenceNode(refIdentifier, undefined);

      const propertySignature = createPropertySignature(
        navigation.Name,
        isArray
          ? ts.factory.createTypeLiteralNode([
              createPropertySignature('results', ts.factory.createArrayTypeNode(refTypeNode)),
            ])
          : refTypeNode,
        true,
      );
      properties.push(propertySignature);
    }
  }

  let typeAlias = createTypeAliasDeclaration(entity.Name, properties);

  typeAlias = options.onCreateEntity?.(typeAlias, { metadata, entity }) ?? typeAlias;

  return typeAlias;
}

export function createPropertySignature(name: string, type: ts.TypeNode, optional = false) {
  return ts.factory.createPropertySignature(
    undefined,
    ts.factory.createIdentifier(name),
    optional ? ts.factory.createToken(ts.SyntaxKind.QuestionToken) : undefined,
    type,
  );
}

export function createTypeAliasDeclaration(name: string, properties: ts.TypeElement[]) {
  const modifiers = [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)];

  const typeAlias = ts.factory.createTypeAliasDeclaration(
    modifiers,
    name,
    undefined,
    ts.factory.createTypeLiteralNode(properties),
  );
  return typeAlias;
}

export function getPrimitivePropertyTypeComment(propertyInfo: OdataV2.Property): string {
  if (['Edm.Boolean', 'Edm.String'].includes(propertyInfo.Type)) {
    return '';
  }
  const type = propertyInfo.Type.split('.')[1];
  return type;
}

// https://www.odata.org/documentation/odata-version-2-0/overview/
function toTSType(type: OdataV2.PrimitivePropertyType): ts.TypeNode {
  switch (type) {
    case 'Edm.Boolean':
      return ts.factory.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword);
    case 'Edm.Int16':
    case 'Edm.Int32':
    case 'Edm.Int64':
    case 'Edm.Double':
    case 'Edm.Byte':
    case 'Edm.SByte':
      return ts.factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword);
    case 'Edm.String':
    case 'Edm.Guid':
    case 'Edm.Single':
    case 'Edm.Binary':
    case 'Edm.Decimal':
      return ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword);
    case 'Edm.DateTimeOffset':
    case 'Edm.DateTime':
      return ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('Date'), undefined);
    default:
      throw new Error('unknown type: ' + type);
  }
}
