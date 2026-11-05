#!/usr/bin/env node
/** Install dsh-prompt-workshop into the DSH desktop profile as a linked bundle.
 *
 * Idempotent: creates (or refreshes) the node_modules junction, records the
 * dependency and appends the bundle selection. Backs up the profile files first.
 * Writes outside the workspace, so run it with the DSH app closed or accept the
 * live HMR reload the desktop host performs on profile manifest changes.
 */
import { readFileSync, writeFileSync, existsSync, copyFileSync, mkdirSync, rmSync, lstatSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { homedir } from 'node:os'
import { fileURLToPath } from 'node:url'

const PLUGIN_NAME = 'dsh-prompt-workshop'
const pluginDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dshHome = (process.env.DSH_HOME && process.env.DSH_HOME.trim()) || join(homedir(), '.dsh')
const profileName = process.argv[2] || 'desktop'
const profileDir = join(dshHome, 'profiles', profileName)

function die(message) { console.error('[install] ' + message); process.exit(1) }
function info(message) { console.log('[install] ' + message) }

if (!existsSync(join(profileDir, 'package.json'))) die('找不到 profile：' + profileDir)
if (!existsSync(join(pluginDir, 'index.js'))) die('插件入口缺失：' + join(pluginDir, 'index.js'))

const stamp = new Date().toISOString().replace(/[:.]/g, '-')
for (const name of ['package.json', 'cordis.patch.yml', 'pnpm-lock.yaml']) {
  const source = join(profileDir, name)
  if (!existsSync(source)) continue
  copyFileSync(source, source + '.bak-prompt-workshop-' + stamp)
}
info('已备份 profile 文件 (*.bak-prompt-workshop-' + stamp + ')')

const nodeModules = join(profileDir, 'node_modules')
mkdirSync(nodeModules, { recursive: true })
const linkPath = join(nodeModules, PLUGIN_NAME)
try {
  const stats = lstatSync(linkPath)
  if (stats) rmSync(linkPath, { recursive: true, force: true })
} catch { /* not installed yet */ }
try {
  const { symlinkSync } = globalThis.__mockFs
  symlinkSync(pluginDir, linkPath, 'junction')
  info('已创建链接：' + linkPath + ' -> ' + pluginDir)
} catch (error) {
  die('创建 node_modules 链接失败：' + (error && error.message ? error.message : error))
}

const pkgPath = join(profileDir, 'package.json')
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
pkg.dependencies = pkg.dependencies || {}
pkg.dependencies[PLUGIN_NAME] = 'link:' + pluginDir.replace(/\\/g, '/')
if (!pkg.dsh || !pkg.dsh.profile || !Array.isArray(pkg.dsh.profile.bundles)) die('profile package.json 缺少 dsh.profile.bundles')
if (!pkg.dsh.profile.bundles.includes(PLUGIN_NAME)) pkg.dsh.profile.bundles.push(PLUGIN_NAME)
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
info('已登记依赖与 bundle：dependencies.' + PLUGIN_NAME + ' + dsh.profile.bundles')

const patchPath = join(profileDir, 'cordis.patch.yml')
if (!existsSync(patchPath)) writeFileSync(patchPath, '# profile patch layer\n')
info('安装完成。运行中的 DSH 会通过 profile HMR 自动重载该 bundle；未启用 HMR 时重启 DSH 后生效。')
