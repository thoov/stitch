import { Project } from 'fixturify-project';
import findBadPackages from '../src/checkup-plugin-embroider/helpers/find-bad-packages';

describe('dependency-compatibility-test', () => {
  let project: Project;

  beforeEach(function () {
    project = new Project('fake-project', '0.0.1');
  });

  afterEach(function () {
    project.dispose();
  });

  it('if all dependencies pass compatibility check', async () => {
    project.addDependency('foo', '1.0.0');
    project.addDependency('bar', '2.0.0');
    project.addDependency('baz', '3.0.0');

    project.writeSync();

    const packageCompatibilityJSON = {};
    const pkgsFound = await findBadPackages(project.baseDir, packageCompatibilityJSON);
    expect(pkgsFound).toStrictEqual([]);
  });

  it('if some dependencies fail compatibility check', async () => {
    project.addDependency('foo', '1.0.0');
    project.addDependency('bar', '2.0.0');
    project.addDependency('baz', '3.0.0');

    project.writeSync();

    const packageCompatibilityJSON = {
      'foo': '>=2.0.0'
    };

    const pkgsFound = await findBadPackages(project.baseDir, packageCompatibilityJSON);
    expect(pkgsFound).toStrictEqual([{
      packageName: 'foo',
      packageVersion: '1.0.0',
      packageBreadcrumb: ['fake-project']
    }]);
  });

  it('with deeply nested addons the breadcrumb is correct', async () => {
    const foo = project.addDependency('foo', '1.0.0');
    const bar = project.addDependency('bar', '1.0.0');
    project.addDependency('target', '1.0.0');
    foo.addDependency('target', '1.0.0');
    const nested = bar.addDependency('nested', '1.0.0');
    nested.addDependency('target', '1.0.0');
    project.writeSync();

    const packageCompatibilityJSON = {
      'target': '>=2.0.0'
    };

    const pkgsFound = await findBadPackages(project.baseDir, packageCompatibilityJSON);
    expect(pkgsFound).toStrictEqual([{
      packageName: 'target',
      packageVersion: '1.0.0',
      packageBreadcrumb: ['fake-project', 'foo']
    }, {
      packageName: 'target',
      packageVersion: '1.0.0',
      packageBreadcrumb: ['fake-project', 'bar', 'nested']
    }, {
      packageName: 'target',
      packageVersion: '1.0.0',
      packageBreadcrumb: ['fake-project']
    }]);
  });

  it('only packages with versions that do not satisfy semver get returned', async () => {
    const foo = project.addDependency('foo', '1.0.0');
    const bar = project.addDependency('bar', '1.0.0');
    project.addDependency('target', '1.0.0');
    foo.addDependency('target', '2.0.0');
    const nested = bar.addDependency('nested', '1.0.0');
    nested.addDependency('target', '1.0.0');
    project.writeSync();

    const packageCompatibilityJSON = {
      'target': '>=2.0.0'
    };

    const pkgsFound = await findBadPackages(project.baseDir, packageCompatibilityJSON);
    expect(pkgsFound).toStrictEqual([{
      packageName: 'target',
      packageVersion: '1.0.0',
      packageBreadcrumb: ['fake-project', 'bar', 'nested']
    }, {
      packageName: 'target',
      packageVersion: '1.0.0',
      packageBreadcrumb: ['fake-project']
    }]);
  });
});