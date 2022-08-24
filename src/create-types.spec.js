"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const typescript_1 = __importDefault(require("typescript"));
const create_types_1 = require("./create-types");
const metadata_wrapper_1 = require("./metadata-wrapper");
const printer = typescript_1.default.createPrinter();
const print = (node) => {
    const resultFile = typescript_1.default.createSourceFile('someFileName.ts', '', typescript_1.default.ScriptTarget.Latest, false, typescript_1.default.ScriptKind.TS);
    const source = printer.printNode(typescript_1.default.EmitHint.Unspecified, node, resultFile);
    return source;
};
describe('create-types', () => {
    it('createComplexTypeAliasDeclaration() create complex type from metadata', () => {
        const complexTypeInfo = {
            Name: 'SomeComplexType',
            Property: [
                { Name: 'A', Type: 'Edm.String' },
                { Name: 'B', Type: 'Edm.Int32' },
                { Name: 'C', Type: 'Edm.DateTime', Nullable: true },
            ],
        };
        const typeAliasDeclaration = (0, create_types_1.createComplexTypeAliasDeclaration)(complexTypeInfo);
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
        const entityTypeInfo = {
            Name: 'SomeEntityType',
            Key: { PropertyRef: { Name: 'Id' } },
            Property: [
                { Name: 'Id', Type: 'Edm.Int32' },
                { Name: 'A', Type: 'Edm.String' },
                { Name: 'B', Type: 'Edm.DateTime', Nullable: true },
            ],
        };
        const metadata = new metadata_wrapper_1.MetadataWrapper({
            Namespace: 'SomeNamespace',
            EntityType: [entityTypeInfo],
            ComplexType: [],
            Association: [],
        });
        const typeAliasDeclaration = (0, create_types_1.createEntityTypeAliasDeclaration)(entityTypeInfo, metadata);
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
        const entityTypeInfo = {
            Name: 'SomeEntityType',
            Key: { PropertyRef: { Name: 'Id' } },
            Property: [{ Name: 'Id', Type: 'Edm.Int32' }],
            NavigationProperty: [
                { Name: 'A', Relationship: 'SomeNamespace.SomeEntityType_A_S_AnotherEntityType', FromRole: '', ToRole: '' },
            ],
        };
        const metadata = new metadata_wrapper_1.MetadataWrapper({
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
        const typeAliasDeclaration = (0, create_types_1.createEntityTypeAliasDeclaration)(entityTypeInfo, metadata);
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
        const entityTypeInfo = {
            Name: 'SomeEntityType',
            Key: { PropertyRef: { Name: 'Id' } },
            Property: [{ Name: 'Id', Type: 'Edm.Int32' }],
            NavigationProperty: [
                { Name: 'A', Relationship: 'SomeNamespace.SomeEntityType_A_S_AnotherEntityType', FromRole: '', ToRole: '' },
            ],
        };
        const metadata = new metadata_wrapper_1.MetadataWrapper({
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
        const typeAliasDeclaration = (0, create_types_1.createEntityTypeAliasDeclaration)(entityTypeInfo, metadata);
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
