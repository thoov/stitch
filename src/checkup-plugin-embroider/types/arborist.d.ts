declare module '@npmcli/arborist' {
  class Arborist {
    constructor({}: ArboristConstructorOptions);
    loadActual(): Promise<ArboristNode>;
  }

  export interface ArboristNode {
    name: string;
    packageName: string;
    version: string;
    parent: ArboristNode | null;
    edgesOut: Map<string, ArboristEdge>;
    edgesIn: Map<string, ArboristEdge>;
  }

  export interface ArboristEdge {
    name: string;
    type: string;
    from: ArboristNode;
    to?: ArboristNode;
  }

  export interface ArboristConstructorOptions {
    path: string;
  }

  export default Arborist;
}