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
  const arb = new Arborist({ path: root });
  const tree = await arb.loadActual();
  const badPackages = new Set<StitchResult>();
  const seen = new Set<any>();

  // this is recursive
  traverseDependencies(tree, packagesToCheck, badPackages, seen);
  return [...badPackages];
}

function traverseDependencies(node: any, packagesToCheck: PackageCheck, results: Set<StitchResult>, seen: Set<any>) {
  // this is a package with no dependencies so we have reacted the bottom of the recursive stack
  if (node.edgesOut.size === 0) {
    return;
  }

  // this prevents circular loops and stack overflows
  if (seen.has(node)) {
    return;
  }

  seen.add(node);

  for (const [name, edgePkg] of [...node.edgesOut]) { // eslint-disable-line @typescript-eslint/no-unused-vars
    // edgePkg might not have a 'to' property. this is the case when this "dependency" is a provided as a peerDependency. when we encounter
    // this we ignore it as the pakage that would be responsible for "fixing" it is not this one
    // (and instead the one that included it).
    const dependency = edgePkg.to;
    if (dependency && packagesToCheck[dependency.name] && !semver.satisfies(dependency.version, packagesToCheck[dependency.name])) {
      results.add({
        packageName: dependency.name,
        packageVersion: dependency.version,
        packageBreadcrumb: createBreadcrumb(edgePkg.from)
      });
    }

    if (dependency) {
      traverseDependencies(dependency, packagesToCheck, results, seen);
    }
  }
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