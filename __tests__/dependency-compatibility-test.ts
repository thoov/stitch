import { Project } from 'fixturify-project';
import findBadPackages from '../src/checkup-plugin-embroider/helpers/find-bad-packages';

describe('markdown-formatter-test', () => {
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
});
