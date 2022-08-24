const primitivePropertyTypes = [
  'Edm.Boolean',
  'Edm.Byte',
  'Edm.Binary',
  'Edm.DateTime',
  'Edm.DateTimeOffset',
  'Edm.Decimal',
  'Edm.Double',
  'Edm.Guid',
  'Edm.Int16',
  'Edm.Int32',
  'Edm.Int64',
  'Edm.SByte',
  'Edm.Single',
  'Edm.String',
] as const;
export type PrimitivePropertyType = typeof primitivePropertyTypes[number];

export type Property = {
  Name: string;
  Type: PrimitivePropertyType | string;
  Nullable?: boolean;
};

export type NavigationProperty = {
  Name: string;
  /**
   * [Namespace].[Association.Name]
   */
  Relationship: string;
  FromRole: string;
  ToRole: string;
};

export type End = {
  /**
   * [Namespace].[EntityType.Name]
   */
  Type: string;
  /**
   * 0..1 - one or none,
   * 1 - exactly one,
   * '*' - many
   */
  Multiplicity: '0..1' | '1' | '*';
  Role: string;
};

export type Association = {
  Name: string;
  End: [End, End];
};
export type ComplexType = {
  Name: string;
  Property?: Property[];
};

export type EntityType = {
  Key: { PropertyRef: { Name: string } };
  Name: string;
  Property?: Property[];
  NavigationProperty?: NavigationProperty[];
};

export type Schema = {
  Namespace: string;
  EntityType?: EntityType[];
  ComplexType?: ComplexType[];
  Association?: Association[];
  // TODO: https://sapui5.hana.ondemand.com/1.36.6/docs/guide/341823349ed04df1813197f2a0d71db2.html
  // EntityContainer: any;
};

export function isPrimitive(type: string): type is PrimitivePropertyType {
  return primitivePropertyTypes.includes(type as any);
}
