import { XMLParser } from 'fast-xml-parser';
import * as OdataV2 from './odata-v2-types';

export class MetadataWrapper {
  private associationsDict: Record<string, OdataV2.Association>;

  constructor(readonly schema: OdataV2.Schema) {
    this.associationsDict = this.createAssociationsDict();
  }

  static fromString(xml: string) {
    const schema = parseMetadata(xml);
    return new MetadataWrapper(schema);
  }

  private createAssociationsDict() {
    const associationsDict: Record<string, OdataV2.Association> = {};
    for (const association of this.associations) {
      associationsDict[association.Name] = association;
    }
    return associationsDict;
  }

  get associations() {
    return this.schema.Association ?? [];
  }

  get complexTypes() {
    return this.schema.ComplexType ?? [];
  }

  get entityTypes() {
    return this.schema.EntityType ?? [];
  }

  getAssociation(relationship: string): OdataV2.Association {
    const associationName = relationship.split('.')[1]; // Drop namespace
    const association = this.associationsDict[associationName];
    return association;
  }
}

function parseMetadata(xml: string): OdataV2.Schema {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    removeNSPrefix: true,
    parseAttributeValue: true,
    isArray: (tagName) =>
      ['NavigationProperty', 'Property', 'ComplexType', 'EntityType', 'Association', 'PropertyRef'].includes(tagName),
  });
  const jObj = parser.parse(xml);

  const schema: OdataV2.Schema = jObj.Edmx.DataServices.Schema;
  return schema;
}
