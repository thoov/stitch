import path from 'path';
import fs from 'fs-extra';
import globby from 'globby';

export default async function (root: string): Promise<string[]> {
  const pkgJson = await fs.readJson(path.join(root, 'package.json'));

  let inRepoPaths = [];
  if (pkgJson['ember-addon'] && pkgJson['ember-addon'].paths) {
    inRepoPaths = pkgJson['ember-addon'].paths;
  }

  const problematicAddons: string[] = [];

  for (const inRepoPath of inRepoPaths) {
    const inRepoFullPath = path.join(root, inRepoPath);
    const inRepoPkg = await fs.readJson(path.join(inRepoFullPath, 'package.json'));

    if (
      !keywordContains(inRepoPkg, 'eyeglass-module')
      || !inRepoPkg.eyeglass
      || !inRepoPkg.dependencies
      || !inRepoPkg.dependencies['ember-cli-eyeglass']
      ) {
        const scssFiles = await globby(['app/styles/**/*.scss'], { cwd: inRepoFullPath });
        if (scssFiles.length > 0) {
          problematicAddons.push(inRepoPkg.name);
        }
    } else  {
      if (!fs.existsSync(path.join(inRepoFullPath, 'addon/styles/index.scss'))) {
        problematicAddons.push(inRepoPkg.name);
      }
    }
  }

  return problematicAddons;
}

function keywordContains(pkg: any, search: string) {
  if (!pkg['keywords']) {
    return false;
  }

  return pkg['keywords'].includes(search);
}