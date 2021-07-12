import path from 'path';
import fs from 'fs-extra';
import globby from 'globby';

export default async function findBadEyeglassModules(root: string, badModules: string[] = []): Promise<string[]> {
  const pkgJson = await fs.readJson(path.join(root, 'package.json'));

  let inRepoPaths = [];
  if (pkgJson['ember-addon'] && pkgJson['ember-addon'].paths) {
    inRepoPaths = pkgJson['ember-addon'].paths;
  }

  for (const inRepoPath of inRepoPaths) {
    const inRepoFullPath = path.join(root, inRepoPath);
    const inRepoPkg = await fs.readJson(path.join(inRepoFullPath, 'package.json'));
    const isBad = await isBadEyeglassModule(inRepoPkg, inRepoFullPath);

    if (isBad) {
      badModules.push(inRepoPkg.name);
    }

    await findBadEyeglassModules(inRepoFullPath, badModules);
  }

  return badModules;
}

async function isBadEyeglassModule(inRepoPkg: any, inRepoFullPath: string): Promise<boolean> {
  if (
    !keywordContains(inRepoPkg, 'eyeglass-module')
    || !inRepoPkg.eyeglass
    || !inRepoPkg.dependencies
    || !inRepoPkg.dependencies['ember-cli-eyeglass']
    ) {
      const scssFiles = await globby(['app/styles/**/*.scss'], { cwd: inRepoFullPath });
      if (scssFiles.length > 0) {
        return true;
      }
  } else  {
    if (!fs.existsSync(path.join(inRepoFullPath, 'addon/styles/index.scss'))) {
      return true;
    }
  }

  return false;
}

function keywordContains(pkg: any, search: string) {
  if (!pkg['keywords']) {
    return false;
  }

  return pkg['keywords'].includes(search);
}