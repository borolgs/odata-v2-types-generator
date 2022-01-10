import ts from 'typescript';
import * as OdataV2 from './odata-v2.types';
import { createMetadata, MetadataWrapper } from './metadata';

export function createTypesFromMetadata(xml: string): string {
  const metadata = createMetadata(xml);
  const metadataWrapper = new MetadataWrapper(metadata);
  const source = createSource(metadataWrapper);
  return source;
}

export function createSource(metadata: MetadataWrapper): string {
  const tsFile = ts.createSourceFile('_.ts', '', ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
  const statements: ts.Statement[] = [];

  for (const complexType of metadata.complexTypes) {
    const typeAlias = createComplexTypeAliasDeclaration(complexType);
    statements.push(typeAlias);
  }

  for (const entity of metadata.entityTypes) {
    const typeAlias = createEntityTypeAliasDeclaration(entity, metadata);
    statements.push(typeAlias);
  }

  Object.assign(tsFile, {
    statements: ts.factory.createNodeArray(statements),
  });

  const result = ts.transform(tsFile, []);
  const transformedNodes = result.transformed[0];

  const printer = ts.createPrinter();
  const source = printer.printNode(ts.EmitHint.SourceFile, transformedNodes, tsFile);
  return source;
}

export function createComplexTypeAliasDeclaration(complexType: OdataV2.ComplexType) {
  const properties: ts.TypeElement[] = [];

  for (const property of complexType.Property ?? []) {
    if (!OdataV2.isPrimitive(property.Type)) {
      throw new Error(`Not implemented complex type property: ${property.Type}`);
    }

    const propertySignature = createPropertySignature(property.Name, toTSType(property.Type), !!property.Nullable);
    addCommentToPrimitivePropertySignature(propertySignature, property);
    properties.push(propertySignature);
  }

  const typeAlias = createTypeAliasDeclaration(complexType.Name, properties);
  ts.addSyntheticLeadingComment(typeAlias, ts.SyntaxKind.MultiLineCommentTrivia, '* Complex Type ', true);
  return typeAlias;
}

export function createEntityTypeAliasDeclaration(entity: OdataV2.EntityType, metadata: MetadataWrapper) {
  const properties: ts.TypeElement[] = [];

  for (const property of entity.Property ?? []) {
    let propertySignature: ts.PropertySignature;
    if (property.Type.startsWith('Edm')) {
      if (OdataV2.isPrimitive(property.Type)) {
        propertySignature = createPropertySignature(property.Name, toTSType(property.Type), !!property.Nullable);
        addCommentToPrimitivePropertySignature(propertySignature, property);
      } else {
        // TODO: handle other Edm types
        continue;
      }
    } else {
      const complexTypeName = property.Type.split('.')[1]; // Drop namespace
      const propertyType = ts.factory.createTypeReferenceNode(ts.factory.createIdentifier(complexTypeName), undefined);
      propertySignature = createPropertySignature(property.Name, propertyType, !!property.Nullable);
    }
    properties.push(propertySignature);
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

  const typeAlias = createTypeAliasDeclaration(entity.Name, properties);
  ts.addSyntheticLeadingComment(typeAlias, ts.SyntaxKind.MultiLineCommentTrivia, '* Entity ', true);

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
    undefined,
    modifiers,
    name,
    undefined,
    ts.factory.createTypeLiteralNode(properties),
  );
  return typeAlias;
}

export function addCommentToPrimitivePropertySignature(
  propertySignature: ts.PropertySignature,
  propertyInfo: OdataV2.Property,
): void {
  if (['Edm.Boolean', 'Edm.String'].includes(propertyInfo.Type)) {
    return;
  }
  const type = propertyInfo.Type.split('.')[1];
  ts.addSyntheticLeadingComment(propertySignature, ts.SyntaxKind.MultiLineCommentTrivia, `* ${type} `, true);
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
