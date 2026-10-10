import { spawn } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const baseUrl = (process.env.LIGHTHOUSE_BASE_URL || 'http://localhost:4173').replace(/\/$/, '')
const outputDir = path.resolve(process.env.LIGHTHOUSE_OUTPUT_DIR || 'reports/lighthouse')
const pages = [
  { name: 'home', path: '/' },
  { name: 'nft-detail', path: '/nft/1' },
]
const profiles = [
  { name: 'desktop', flags: ['--preset=desktop'] },
  { name: 'mobile', flags: ['--form-factor=mobile', '--screenEmulation.mobile', '--screenEmulation.width=390', '--screenEmulation.height=844', '--screenEmulation.deviceScaleFactor=1'] },
]
const runs = 3
const results = []

await mkdir(outputDir, { recursive: true })

function runLighthouse(url, htmlPath, jsonPath, profileFlags) {
  return new Promise((resolve, reject) => {
    const args = [
      '--yes', 'lighthouse', url,
      '--output=html', '--output=json',
      `--output-path=${path.resolve(htmlPath).replace(/\.html$/, '').replace(/\.json$/, '')}`,
      '--chrome-flags=--headless --no-sandbox', '--quiet',
      ...profileFlags,
    ]
    const child = spawn('npx', args, { stdio: 'inherit', shell: process.platform === 'win32' })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) resolve({ htmlPath, jsonPath })
      else reject(new Error(`Lighthouse terminou com código ${code}. Confira Chrome e acesso ao pacote Lighthouse.`))
    })
  })
}

for (const page of pages) {
  for (const profile of profiles) {
    for (let run = 1; run <= runs; run++) {
      const stem = `${page.name}-${profile.name}-${run}`
      const htmlPath = path.join(outputDir, `${stem}.html`)
      const jsonPath = path.join(outputDir, `${stem}.report.json`)
      const actualHtmlPath = path.join(outputDir, `${stem}.report.html`)
      console.log(`\n[Lighthouse ${run}/${runs}] ${profile.name}: ${baseUrl}${page.path}`)
      await runLighthouse(`${baseUrl}${page.path}`, actualHtmlPath, jsonPath, profile.flags)
      const report = JSON.parse(await readFile(jsonPath, 'utf8'))
      const categories = report.categories || {}
      const audits = report.audits || {}
      results.push({
        page: page.name,
        profile: profile.name,
        run,
        performance: Math.round((categories.performance?.score ?? 0) * 100),
        accessibility: Math.round((categories.accessibility?.score ?? 0) * 100),
        bestPractices: Math.round((categories['best-practices']?.score ?? 0) * 100),
        seo: Math.round((categories.seo?.score ?? 0) * 100),
        lcpMs: audits['largest-contentful-paint']?.numericValue ?? null,
        cls: audits['cumulative-layout-shift']?.numericValue ?? null,
        tbtMs: audits['total-blocking-time']?.numericValue ?? null,
        html: path.basename(actualHtmlPath),
        json: path.basename(jsonPath),
      })
    }
  }
}

const median = (values) => {
  const sorted = values.filter((v) => typeof v === 'number' && Number.isFinite(v)).sort((a, b) => a - b)
  if (!sorted.length) return null
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}
const summary = []
for (const page of pages) for (const profile of profiles) {
  const group = results.filter((r) => r.page === page.name && r.profile === profile.name)
  const fields = ['performance', 'accessibility', 'bestPractices', 'seo', 'lcpMs', 'cls', 'tbtMs']
  const row = { page: page.name, profile: profile.name, measurements: group.length }
  for (const field of fields) row[field] = median(group.map((r) => r[field]))
  summary.push(row)
}
await writeFile(path.join(outputDir, 'summary.json'), JSON.stringify({ baseUrl, generatedAt: new Date().toISOString(), runs: results, medians: summary }, null, 2))
const csv = [
  'page,profile,measurements,performance,accessibility,bestPractices,seo,lcpMs,cls,tbtMs',
  ...summary.map((r) => [r.page, r.profile, r.measurements, r.performance, r.accessibility, r.bestPractices, r.seo, r.lcpMs, r.cls, r.tbtMs].join(',')),
].join('\n')
await writeFile(path.join(outputDir, 'summary.csv'), `${csv}\n`)
console.log(`\nAuditoria concluída. Relatórios HTML/JSON e medianas: ${outputDir}`)
console.table(summary)
