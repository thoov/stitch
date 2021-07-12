import { Project } from 'fixturify-project';
import findBadEyeglassModules from '../src/checkup-plugin-embroider/helpers/find-bad-eyeglass-modules';

describe('eyeglass-modules-test', () => {
  let project: Project;

  beforeEach(function () {
    project = new Project('fake-project', '0.0.1');
  });

  afterEach(function () {
    project.dispose();
  });

  it('if all in repo addons pass check', async () => {
    project.pkg['ember-addon'] = {};
    (project.pkg['ember-addon'] as any).paths = [
      'lib/foo',
      'lib/bar',
      'lib/baz'
    ];

    project.files = {
      lib: {
        foo: {
          'package.json': `{ "name": "foo" }`,
          addon: {
            styles: {
              'index.scss': ''
            }
          }
        },
        bar: {
          'package.json': `{ "name": "bar" }`,
          addon: {
            styles: {
              'index.scss': ''
            }
          }
        },
        baz: {
          'package.json': `{ "name": "baz" }`,
          addon: {
            styles: {
              'index.scss': ''
            }
          }
        }
      }
    }

    project.writeSync();

    const addonsFound = await findBadEyeglassModules(project.baseDir);
    expect(addonsFound).toStrictEqual([]);
  });

  it('if finds incorrect eyeglass modules', async () => {
    project.pkg['ember-addon'] = {};
    (project.pkg['ember-addon'] as any).paths = [
      'lib/foo',
      'lib/bar',
      'lib/baz'
    ];

    project.files = {
      lib: {
        foo: {
          'package.json': `{ "name": "foo" }`,
          app: {
            styles: {
              'index.scss': ''
            }
          }
        },
        bar: {
          'package.json': `{ "name": "bar" }`,
          addon: {
            styles: {
              'index.scss': ''
            }
          }
        },
        baz: {
          'package.json': `{ "name": "baz" }`,
          app: {
            styles: {
              'index.scss': ''
            }
          }
        }
      }
    }

    project.writeSync();

    const addonsFound = await findBadEyeglassModules(project.baseDir);
    expect(addonsFound).toStrictEqual(['foo', 'baz']);
  });

  it('if finds nested incorrect eyeglass modules in nested in repo addons', async () => {
    project.pkg['ember-addon'] = {};
    (project.pkg['ember-addon'] as any).paths = [
      'lib/foo',
    ];

    project.files = {
      lib: {
        foo: {
          'package.json': `{ "name": "foo", "ember-addon": { "paths": ["lib/bar"] } }`,
          app: {
            styles: {
              'index.scss': ''
            }
          },
          lib: {
            bar: {
              'package.json': `{ "name": "bar", "ember-addon": { "paths": ["lib/baz"] } }`,
              addon: {
                styles: {
                  'index.scss': ''
                }
              },
              lib: {
                baz: {
                  'package.json': `{ "name": "baz" }`,
                  app: {
                    styles: {
                      'index.scss': ''
                    }
                  }
                }
              }
            },
          }
        },
      }
    }

    project.writeSync();

    const addonsFound = await findBadEyeglassModules(project.baseDir);
    expect(addonsFound).toStrictEqual(['foo', 'baz']);
  });

  it('if finds incorrect eyeglass modules if index.scss is not found', async () => {
    project.pkg['ember-addon'] = {};
    (project.pkg['ember-addon'] as any).paths = [
      'lib/foo'
    ];

    project.files = {
      lib: {
        foo: {
          'package.json': `
            {
              "name": "foo",
              "keywords": ["eyeglass-module"],
              "eyeglass": { "sassDir": "addon/styles", "needs": "^2.0.0" },
              "dependencies": {
                "ember-cli-eyeglass": "*"
              }
            }
          `,
          addon: {
            styles: {
              'foobar.scss': ''
            }
          }
        }
      }
    }

    project.writeSync();

    const addonsFound = await findBadEyeglassModules(project.baseDir);
    expect(addonsFound).toStrictEqual(['foo']);
  });
});