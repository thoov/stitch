import Arborist from '@npmcli/arborist';
import semver from 'semver';

interface PackageCheck {
  [index: string]: string;
}

interface StitchResult {
  packageName: string;
  packageVersion: string;
  packageBreadcrumb: string[];
}

export default async function (root: string, packagesToCheck: PackageCheck): Promise<StitchResult[]> {
  const results: StitchResult[] = [];
  const arb = new Arborist({ path: root });
  const tree = await arb.loadActual();

  for (const name in packagesToCheck) {
    const semverRange = packagesToCheck[name];
    const pkgNode = tree.children.get(name);

    if (pkgNode && !semver.satisfies(pkgNode.version, semverRange)) {
      for (const edgePkg of [...pkgNode.edgesIn]) {
        results.push({
          packageName: name,
          packageVersion: pkgNode.version,
          packageBreadcrumb: createBreadcrumb(edgePkg.from)
        });
      }
    }
  }

  return results;
}

function createBreadcrumb(node: any): string[] {
  const breadcrumbs: string[] = [node.packageName];

  let parent = node.parent;
  while (parent !== null) {
    breadcrumbs.unshift(parent.packageName);
    parent = parent.parent;
  }

  return breadcrumbs;
}