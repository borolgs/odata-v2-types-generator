import { XMLParser } from 'fast-xml-parser';
import * as OdataV2 from './odata-v2.types';

export function createMetadata(xml: string): OdataV2.Metadata {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    removeNSPrefix: true,
    parseAttributeValue: true,
    isArray: (tagName) =>
      ['NavigationProperty', 'Property', 'ComplexType', 'EntityType', 'Association'].includes(tagName),
  });
  const jObj = parser.parse(xml);

  const schema = jObj.Edmx.DataServices.Schema;

  const namespace = schema.Namespace;
  const associations = schema.Association as OdataV2.Association[];

  const metadata = {
    namespace,
    entityTypes: schema.EntityType,
    complexTypes: schema.ComplexType,
    associations,
  };
  return metadata;
}

export class MetadataWrapper {
  private associationsDict: Record<string, OdataV2.Association>;
  constructor(private readonly metadata: OdataV2.Metadata) {
    this.associationsDict = metadata.associations.reduce<Record<string, OdataV2.Association>>(
      (acc, association: OdataV2.Association) => {
        acc[association.Name] = association;
        return acc;
      },
      {},
    );
  }

  get complexTypes() {
    return this.metadata.complexTypes;
  }

  get entityTypes() {
    return this.metadata.entityTypes;
  }

  getAssociation(relationship: string): OdataV2.Association {
    const associationName = relationship.split('.')[1]; // Drop namespace
    const association = this.associationsDict[associationName];
    return association;
  }
}
