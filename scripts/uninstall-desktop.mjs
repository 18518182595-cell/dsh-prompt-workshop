#!/usr/bin/env node
/** Remove dsh-prompt-workshop from a DSH profile (reverse of install-desktop.mjs). */
import { readFileSync, writeFileSync, existsSync, rmSync, lstatSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { homedir } from 'node:os'
import { fileURLToPath } from 'node:url'

const PLUGIN_NAME = 'dsh-prompt-workshop'
const pluginDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dshHome = (process.env.DSH_HOME && process.env.DSH_HOME.trim()) || join(homedir(), '.dsh')
const profileName = process.argv[2] || 'desktop'
const profileDir = join(dshHome, 'profiles', profileName)
const pkgPath = join(profileDir, 'package.json')
if (!existsSync(pkgPath)) { console.error('找不到 profile：' + profileDir); process.exit(1) }
const linkPath = join(profileDir, 'node_modules', PLUGIN_NAME)
try { if (lstatSync(linkPath)) rmSync(linkPath, { recursive: true, force: true }) } catch { /* absent */ }
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
if (pkg.dependencies) delete pkg.dependencies[PLUGIN_NAME]
if (pkg.dsh && pkg.dsh.profile && Array.isArray(pkg.dsh.profile.bundles)) {
  pkg.dsh.profile.bundles = pkg.dsh.profile.bundles.filter((name) => name !== PLUGIN_NAME)
}
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
console.log('[uninstall] 已从 ' + profileName + ' 移除 ' + PLUGIN_NAME + '（插件目录 ' + pluginDir + ' 保留）')
console.log('[uninstall] 若设置页仍列出该插件，重启 DSH 即可。')
